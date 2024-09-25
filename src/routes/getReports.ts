import { graphql } from '#src/utils';

export const getReports = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `query($limit: Int, $offset: Int){
            reports: reports_aggregate(limit: $limit, offset: $offset, order_by: {updated_at: desc}, ${(request.query.reportId) ? `where: { id: {_eq: "${request.query.reportId}"}}` : ''}
            ) { 
                nodes {
                    id
                    name
                    filters
                    stats
                }
                totalCount: aggregate {count}
            }
        }`,
        variables: {
            limit: parseInt(request.query.limit ?? 100),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    const reports = response?.reports?.nodes.map(obj => ({
        ...obj,
        activeIssues: obj?.stats?.activeIssues,
        mostCommonIssue: obj?.stats?.mostCommonIssue,
    }));

    return {
        status: 'success',
        result: reports,
        total: response?.reports?.totalCount?.count,
    };
}