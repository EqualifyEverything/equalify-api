import { graphqlQuery } from '../utils/index.js';

export const getReports = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `query($first: Int, $offset: Int){
            reports(first: $first, offset: $offset) { 
                nodes {
                    id
                    title
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

    return {
        status: 'success',
        result: response?.reports?.nodes?.map(obj => ({
            ...obj,
            filters: obj?.filters ? JSON.parse(obj?.filters) : null,
        })),
        total: response?.reports?.totalCount,
    };
}