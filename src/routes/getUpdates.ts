import { graphqlQuery } from '../utils/index.js';

export const getUpdates = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `query($first: Int, $offset: Int){
            updates: updatesConnection(first: $first, offset: $offset, ${(request.query.startDate && request.query.endDate) ? `filter: {
                created_at: { greaterThan: "${request.query.startDate}" },
                created_at: { lessThan: "${request.query.endDate}" }
            }` : ''}
                ) { 
                nodes {
                    id
                    created_at
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
        result: response?.updates?.nodes,
        total: response?.updates?.totalCount,
    };
}