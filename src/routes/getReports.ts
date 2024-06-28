import { graphqlQuery } from '#src/utils';

export const getReports = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `query($first: Int, $offset: Int){
            reports: reportsConnection(first: $first, offset: $offset, ${(request.query.reportIds) ? `filter: { id: {in: [
                    ${request.query.reportIds.split(',').map(obj => `"${obj}"`).join()}
                ]}}` : ''}
            ) { 
                nodes {
                    id
                    name
                    filters
                }
                totalCount
            }
        }`,
        variables: {
            first: parseInt(request.query.first ?? 100),
            offset: parseInt(request.query.offset ?? 0),
        },
    }))?.data;

    const reports = response?.reports?.nodes?.map(obj => ({
        ...obj,
        filters: obj?.filters ? JSON.parse(obj?.filters) : null,
    }));

    await Promise.allSettled(reports.map(report => new Promise(async (res) => {
        report.activeIssues = 12;
        report.mostCommonIssue = `Accessibility issue`;
        res(1);
    })));

    return {
        status: 'success',
        result: reports,
        total: response?.reports?.totalCount,
    };
}