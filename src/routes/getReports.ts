import { db, getMode, hasuraQuery } from '#src/utils';

export const getReports = async ({ request, reply }) => {
    const response = await hasuraQuery({
        request,
        query: `query($limit: Int, $offset: Int){
            reports: reports_aggregate(limit: $limit, offset: $offset, ${(request.query.reportId) ? `where: { id: {_eq: "${request.query.reportId}"}}` : ''}
            ) { 
                nodes {
                    id
                    name
                    filters
                }
                totalCount: aggregate {count}
            }
        }`,
        variables: {
            limit: parseInt(request.query.limit ?? 100),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    const reports = response?.reports?.nodes;

    await db.connect();
    await Promise.allSettled(reports?.map(report => new Promise(async (res) => {
        const types = ['properties', 'urls', 'messages', 'nodes', 'tags'];
        const filters = Object.fromEntries(types.map(obj => [obj, []]));
        for (const type of types) {
            filters[type].push(...report.filters.filter(obj => obj.type === type).map(obj => obj.value));
        }

        const urlIds = (await db.query({
            text: `SELECT "id" FROM "urls" WHERE "id" = ANY($1::uuid[]) OR "property_id" = ANY($2::uuid[])`,
            values: [filters.urls, filters.properties],
        })).rows.map(obj => obj.id);

        const messages = (await db.query({
            text: `SELECT m.message FROM enodes as e inner join message_nodes as mn on e.id = mn.enode_id inner join messages as m on mn.message_id = m.id WHERE e.equalified=FALSE AND url_id = ANY($1::uuid[])`,
            values: [urlIds],
        })).rows.map(obj => obj.message);

        report.activeIssues = messages.length;
        report.mostCommonIssue = getMode(messages);
        res(1);
    })));
    await db.clean();

    return {
        status: 'success',
        result: reports,
        total: response?.reports?.totalCount?.count,
    };
}