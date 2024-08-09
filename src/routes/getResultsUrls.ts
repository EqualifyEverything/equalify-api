import { db, hasuraQuery } from '#src/utils';

export const getResultsUrls = async ({ request, reply }) => {
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows?.[0];
    const types = ['properties', 'urls', 'messages', 'nodes', 'tags'];
    const filters = Object.fromEntries(types.map(obj => [obj, []]));
    for (const type of types) {
        filters[type] = report.filters.filter(obj => obj.type === type).map(obj => obj.value)
    }
    await db.clean();

    // Make a request
    const response = await hasuraQuery({
        request,
        query: `query($urlId: uuid!){
            nodes: enodes(where: { url_id: { _eq: $urlId } }) {
                createdAt: created_at
                html
                equalified
                messageNodes: message_nodes {message{id message}}
            }
            url: urls_by_pk(id: $urlId) {id url}
        }`,
        variables: { urlId: request.query.urlId },
    });

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
        url: response.data.url.url,
        urlId: response.data.url.id,
        nodes: response.data.nodes.map(obj => ({
            createdAt: obj.createdAt,
            message: obj.messageNodes?.[0]?.message?.message,
            messageId: obj.messageNodes?.[0]?.message?.id,
            codeSnippet: obj.html,
            status: obj.equalified ? 'Equalified' : 'Active',
        })).sort((a, b) => a.createdAt < b.createdAt ? -1 : 1),
        chart: Object.values(formattedChart)
            .sort((a, b) => a.date > b.date ? -1 : 1),
    };
}