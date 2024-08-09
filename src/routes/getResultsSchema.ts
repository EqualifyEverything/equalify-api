import { db, hasuraQuery } from '#src/utils';

export const getResultsSchema = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows?.[0];
    const types = ['properties', 'urls', 'messages', 'nodes', 'tags'];
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

    // Make a request
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

    return {
        reportName: report.name,
        urls: urls,
        nodes: response.nodes.map(obj => ({
            nodeId: obj.nodeId,
            html: obj.html,
            targets: JSON.parse(obj.targets),
            relatedUrlId: obj.relatedUrlId,
            equalified: obj.equalified,
        })),
        messages: response.nodes.map(obj => obj.messageNodes).flat().map(obj => ({
            id: obj.message.id,
            message: obj.message.message,
        })),
        tags: response.nodes.map(obj => obj.messageNodes).flat().map(obj => obj.message.messageTags).flat().map(obj => ({
            id: obj.tag.id,
            tag: obj.tag.tag,
        })),
    };
}