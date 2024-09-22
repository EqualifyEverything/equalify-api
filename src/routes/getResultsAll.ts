import { db, getMode, graphql } from '#src/utils';
import { gzipSync } from 'zlib';

export const getResultsAll = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters", "cache_date" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows[0];
    const currentDate = new Date().getTime();
    const cacheDate = new Date(report.cache_date).getTime();
    if (currentDate < cacheDate) {
        const compressedBody = (await db.query({
            text: `SELECT "cache_gzip" FROM "reports" WHERE "id"=$1`,
            values: [request.query.reportId],
        })).rows[0].cache_gzip;
        reply.headers({ 'content-encoding': 'gzip' });
        return reply.send(compressedBody);
    }

    const types = ['properties', 'urls', 'messages', 'nodes', 'tags', 'types', 'status'];
    const filters = Object.fromEntries(types.map(obj => [obj, []]));
    for (const type of types) {
        filters[type] = report.filters.filter(obj => obj.type === type).map(obj => obj.value)
    }

    // Check if there are any urls in our request
    const urls = (await db.query({
        text: `SELECT "id", "url" FROM "urls" WHERE "id" = ANY($1::uuid[]) OR "property_id" = ANY($2::uuid[])`,
        values: [filters.urls, filters.properties],
    })).rows;

    const response = await graphql({
        request,
        query: `query (
            $urlIds: [uuid!],
            ${filters.types.length > 0 ? '$typeIds: [String],' : ''}
            ${filters.messages.length > 0 ? '$messageIds: [uuid],' : ''}
            ${filters.tags.length > 0 ? '$tagIds: [uuid],' : ''}
            ${filters.status.length > 0 ? '$equalified: Boolean,' : ''}
        ) {
            nodes: enodes(where: {
                url_id: {_in: $urlIds},
                ${filters.status.length > 0 ? `equalified: {_eq: $equalified},` : ''}
                ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `message_nodes: {message: {` : ``}
                    ${filters.types.length > 0 ? `type: {_in: $typeIds},` : ``}
                    ${filters.messages.length > 0 ? `id: {_in: $messageIds},` : ``}
                    ${filters.tags.length > 0 ? `message_tags:{tag:{id: {_in: $tagIds}}},` : ``}
                ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `}}` : ``}
            }) {
                nodeId: id
                createdAt: created_at
                html
                targets
                relatedUrlId: url_id
                equalified
                enodeUpdates: enode_updates { createdAt: created_at equalified }
                messageNodes: message_nodes(where:{
                    ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `message: {` : ``}
                        ${filters.types.length > 0 ? `type: {_in: $typeIds},` : ``}
                        ${filters.messages.length > 0 ? `id: {_in: $messageIds},` : ``}
                        ${filters.tags.length > 0 ? `message_tags:{tag:{id: {_in: $tagIds}}},` : ``}
                    ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `}` : ``}
                }) {
                    id
                    node: enode {
                        equalified
                    }
                    message {
                        id
                        message
                        type
                        ${urls.length < 100 ? `
                            messageTags: message_tags(where:{
                                ${filters.tags.length > 0 ? `tag:{id: {_in: $tagIds}},` : ``}
                            }) {
                                tag {
                                    id
                                    tag
                                }
                            }
                        ` : ''}
                    }
                }
            }
        }`,
        variables: {
            urlIds: urls.map(obj => obj.id),
            ...filters.types.length > 0 && ({ typeIds: filters.types }),
            ...filters.messages.length > 0 && ({ messageIds: filters.messages }),
            ...filters.tags.length > 0 && ({ tagIds: filters.tags }),
            ...filters.status.length > 0 && ({ equalified: filters.status[0] === 'active' ? false : true }),
        },
    });
    const filteredNodes = response.nodes ?? [];

    const formattedMessages = {};
    for (const message of filteredNodes.map(obj => obj.messageNodes).flat()) {
        if (!formattedMessages[message.message.id]) {
            formattedMessages[message.message.id] = {
                id: message.message.id,
                message: message.message.message,
                type: message.message.type,
                equalifiedCount: 0,
                activeCount: 0,
            };
        }
        formattedMessages[message.message.id][message.node.equalified ? 'equalifiedCount' : 'activeCount'] += 1;
    }

    const formattedTags = {};
    for (const tag of filteredNodes
        .map(obj => obj.messageNodes).flat()
        .map(obj => obj.message?.messageTags ?? []).flat()
        .map(obj => obj.tag)
    ) {
        if (!formattedTags[tag.tag]) {
            formattedTags[tag.tag] = {
                id: tag.id,
                tag: tag.tag,
            };
        }
    }

    const formattedChart = {};
    for (const node of filteredNodes) {
        for (const nodeUpdate of node.enodeUpdates) {
            const date = nodeUpdate.createdAt.split('T')[0];
            if (!formattedChart[date]) {
                formattedChart[date] = {
                    date: date,
                    equalified: 0,
                    active: 0,
                };
            }
            formattedChart[date][nodeUpdate.equalified ? 'equalified' : 'active'] += 1;
        }
    }

    const nodeUrlIds = [...new Set(filteredNodes.map(obj => obj.relatedUrlId))];

    const stats = {
        activeIssues: Object.values(formattedMessages).length,
        mostCommonIssue: getMode(Object.values(formattedMessages).map(obj => obj.message)),
    };
    await db.query({
        text: `UPDATE "reports" SET "stats"=$1 WHERE "id"=$2`,
        values: [stats, request.query.reportId],
    });

    const arrayLimit = 10000;
    const body = {
        reportName: report.name,
        urls: urls.filter(url => nodeUrlIds.slice(0, arrayLimit).includes(url.id)),
        nodes: filteredNodes.slice(0, arrayLimit).map(obj => ({
            nodeId: obj.nodeId,
            html: obj.html,
            targets: obj.targets,
            relatedUrlId: obj.relatedUrlId,
            equalified: obj.equalified,
        })),
        messages: Object.values(formattedMessages)
            .sort((a, b) => a.activeCount > b.activeCount ? -1 : 1).slice(0, arrayLimit)
            .map(obj => ({
                ...obj,
                totalCount: obj.equalifiedCount + obj.activeCount,
            })),
        tags: Object.values(formattedTags),
        chart: Object.values(formattedChart).slice(0, arrayLimit)
            .sort((a, b) => a.date > b.date ? -1 : 1),
    };
    const compressedBody = gzipSync(JSON.stringify(body));
    const cacheExpiry = new Date();
    cacheExpiry.setMinutes(cacheExpiry.getMinutes() + 5);
    await db.query({
        text: `UPDATE "reports" SET "cache_gzip"=$1, "cache_date"=$2 WHERE "id"=$3`,
        values: [compressedBody, cacheExpiry, request.query.reportId],
    });
    await db.clean();
    reply.headers({ 'content-encoding': 'gzip' });
    return reply.send(compressedBody);
}