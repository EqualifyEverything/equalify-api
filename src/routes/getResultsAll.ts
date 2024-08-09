import { db, hasuraQuery } from '#src/utils';

export const getResultsAll = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows?.[0];
    const types = ['properties', 'urls', 'messages', 'nodes', 'tags', 'types'];
    const filters = Object.fromEntries(types.map(obj => [obj, []]));
    for (const type of types) {
        filters[type] = report.filters.filter(obj => obj.type === type).map(obj => obj.value)
    }

    // Check if there are any urls in our request
    const urls = (await db.query({
        text: `SELECT "id", "url" FROM "urls" WHERE "id" = ANY($1::uuid[]) OR "property_id" = ANY($2::uuid[])`,
        values: [filters.urls, filters.properties],
    })).rows;
    await db.clean();

    const response = await hasuraQuery({
        request,
        query: `query (
            $urlIds: [uuid!],
            ${filters.types.length > 0 ? '$typeIds: [String],' : ''}
            ${filters.messages.length > 0 ? '$messageIds: [uuid],' : ''}
        ) {
            nodes: enodes(where: {
                url_id: {_in: $urlIds},
                ${filters.types.length > 0 ? `message_nodes: {message: {type: {_in: $typeIds}}},` : ``}
                ${filters.messages.length > 0 ? `message_nodes: {message: {id: {_in: $messageIds}}},` : ``}
            }) {
                nodeId: id
                createdAt: created_at
                html
                targets
                relatedUrlId: url_id
                equalified
                messageNodes: message_nodes {
                    id
                    node: enode {
                        equalified
                    }
                    message {
                        id
                        message
                        type
                        messageTags: message_tags {
                            tag {
                                id
                                tag
                            }
                        }
                    }
                }
            }
        }`,
        variables: {
            urlIds: urls.map(obj => obj.id),
            ...filters.types.length > 0 && ({ typeIds: filters.types }),
            ...filters.messages.length > 0 && ({ messageIds: filters.messages }),
        },
    });
    const filteredNodes = response?.nodes ?? [];

    const formattedMessages = {};
    for (const message of filteredNodes.map(obj => obj.messageNodes).flat()) {
        if (!formattedMessages?.[message.message.id]) {
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
        .map(obj => obj.message.messageTags).flat()
        .map(obj => obj.tag)
    ) {
        if (!formattedTags?.[tag.tag]) {
            formattedTags[tag.tag] = {
                id: tag.id,
                tag: tag.tag,
            };
        }
    }

    const formattedChart = {};
    for (const node of filteredNodes) {
        const date = node.createdAt.split('T')[0];
        if (!formattedChart?.[date]) {
            formattedChart[date] = {
                date: date,
                equalified: 0,
                active: 0,
            };
        }
        formattedChart[date][node.equalified ? 'equalified' : 'active'] += 1;
    }

    const nodeUrlIds = [...new Set(filteredNodes.map(obj => obj.relatedUrlId))];

    return {
        reportName: report.name,
        urls: urls.filter(url => nodeUrlIds.includes(url.id)),
        nodes: filteredNodes.map(obj => ({
            nodeId: obj.nodeId,
            html: obj.html,
            targets: obj.targets,
            relatedUrlId: obj.relatedUrlId,
            equalified: obj.equalified,
        })),
        messages: Object.values(formattedMessages)
            .sort((a, b) => a.activeCount > b.activeCount ? -1 : 1)
            .map(obj => ({
                ...obj,
                totalCount: obj.equalifiedCount + obj.activeCount,
            })),
        tags: Object.values(formattedTags),
        chart: Object.values(formattedChart)
            .sort((a, b) => a.date > b.date ? -1 : 1),
    };
}