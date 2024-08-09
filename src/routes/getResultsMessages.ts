import { graphqlQuery, db, hasuraQuery } from '#src/utils';

export const getResultsMessages = async ({ request, reply }) => {
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
        query: `query($urlIds: [uuid!], $messageId: uuid!){
            nodes: enodes(filter: { urlId: { in: $urlIds } }) {
                createdAt: created_at
                html
                urlId: url_id
                equalified
                url {url}
                messageNodes: message_nodes {message{id}}
            }
            message(id: $messageId) {message}
        }`,
        variables: { urlIds: urls.map(obj => obj.id), messageId: request.query.messageId },
    });

    const formattedChart = {};
    const filteredNodes = response.data.nodes.filter(obj => obj.messageNodes.map(obj => obj.message.id).includes(request.query.messageId));
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

    const [messageName, moreInfoUrl] = response.data.message.message.split(' More information: ');

    return {
        reportName: report.name,
        messageName: messageName,
        moreInfoUrl: moreInfoUrl,
        nodes: filteredNodes.map(obj => ({
            createdAt: obj.createdAt,
            codeSnippet: obj.html,
            pageUrl: obj.url.url,
            pageId: obj.urlId,
            status: obj.equalified ? 'Equalified' : 'Active',
        })).sort((a, b) => a.createdAt < b.createdAt ? -1 : 1),
        chart: Object.values(formattedChart)
            .sort((a, b) => a.date > b.date ? -1 : 1),
    };
}