import { graphqlQuery, db } from '#src/utils';

export const getResultsTags = async ({ request, reply }) => {
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows?.[0];
    const types = ['properties', 'urls', 'messages', 'nodes', 'tags'];
    const filters = Object.fromEntries(types.map(obj => [obj, []]));
    for (const type of types) {
        filters[type] = report.filters.filter(obj => obj.type === type).map(obj => obj.value)
    }
    const urls = (await db.query({
        text: `SELECT "id", "url" FROM "urls" WHERE "id" = ANY($1::uuid[]) OR "property_id" = ANY($2::uuid[])`,
        values: [filters.urls, filters.properties],
    })).rows;
    await db.clean();

    const response = await graphqlQuery({
        query: `query($urlIds: [UUID!], $tagId: UUID!){
            nodes: enodes(filter: { urlId: { in: $urlIds } }) {
                nodeId: id
                createdAt
                html
                targets
                relatedUrlId: urlId
                equalified
                messageNodes {
                    id
                    node: enode {equalified}
                    message {
                        id
                        message
                        messageTags {
                            tag {id tag}
                        }
                    }
                }
            }
            tag(id: $tagId) {id tag}
        }`,
        variables: { urlIds: urls.map(obj => obj.id), tagId: request.query.tagId },
    });

    const filteredNodes = response.data.nodes
        .filter(obj => obj.messageNodes.map(obj => obj.message.messageTags.map(obj => obj.tag_id)).flat().includes(request.query.messageId));
    const formattedMessages = {};
    for (const message of filteredNodes.map(obj => obj.messageNodes).flat()) {
        if (!formattedMessages?.[message.message.id]) {
            formattedMessages[message.message.id] = {
                id: message.message.id,
                messageId: message.message.id,
                message: message.message.message,
                equalifiedCount: 0,
                activeCount: 0,
            };
        }
        formattedMessages[message.message.id][message.node.equalified ? 'equalifiedCount' : 'activeCount'] += 1;
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

    return {
        reportName: report.name,
        tagName: response.data.tag.tag,
        messages: Object.values(formattedMessages)
            .sort((a, b) => a.activeCount > b.activeCount ? -1 : 1)
            .map(obj => ({
                ...obj,
                totalCount: obj.equalifiedCount + obj.activeCount,
            })),
        chart: Object.values(formattedChart)
            .sort((a, b) => a.date > b.date ? -1 : 1),
    };
}