import { graphqlQuery, db } from '#src/utils';

export const getResultsAll = async ({ request, reply }) => {
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
    const response = await graphqlQuery({
        query: `query($urlIds: [UUID!]){
            nodes: enodes(filter: { urlId: { in: $urlIds } }) {
                nodeId: id
                createdAt
                html
                targets
                relatedUrlId: urlId
                equalified
                messageNodes {
                    id
                    node: enode {
                        equalified
                    }
                    message {
                        id
                        message
                        messageTags {
                            tag {
                                id
                                tag
                            }
                        }
                    }
                }
            }
        }`,
        variables: { urlIds: urls.map(obj => obj.id) },
    });

    const formattedMessages = {};
    for (const message of response.data.nodes.map(obj => obj.messageNodes).flat()) {
        if (!formattedMessages?.[message.message.id]) {
            formattedMessages[message.message.id] = {
                id: message.id,
                message: message.message.message,
                equalifiedCount: 0,
                activeCount: 0,
            };
        }
        formattedMessages[message.message.id][message.node.equalified ? 'equalifiedCount' : 'activeCount'] += 1;
    }

    const formattedChart = {};
    for (const node of response.data.nodes) {
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

    return {
        reportName: report.name,
        urls: urls,
        nodes: response.data.nodes.map(obj => ({
            nodeId: obj.nodeId,
            html: obj.html,
            targets: JSON.parse(obj.targets),
            relatedUrlId: obj.relatedUrlId,
            equalified: obj.equalified,
        })),
        messages: Object.values(formattedMessages)
            .sort((a, b) => a.activeCount > b.activeCount ? -1 : 1)
            .map(obj => ({
                ...obj,
                totalCount: obj.equalifiedCount + obj.activeCount,
            })),
        tags: response.data.nodes
            .map(obj => obj.messageNodes).flat()
            .map(obj => obj.message.messageTags).flat()
            .map(obj => ({
                id: obj.tag.id,
                tag: obj.tag.tag,
            })),
        chart: Object.values(formattedChart)
            .sort((a, b) => a.date > b.date ? -1 : 1),
    };
}