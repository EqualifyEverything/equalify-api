import { graphqlQuery } from '../utils/index.js';

export const getScans = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `query($first: Int, $offset: Int){
            scans(first: $first, offset: $offset, ${(request.query.scanIds) ? `filter: { id: {in: [
                        ${request.query.scanIds.split(',').map(obj => `"${obj}"`).join()}
                    ]}}` : ''}
                ) { 
                nodes {
                    id
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
        result: response?.scans?.nodes,
        total: response?.scans?.totalCount,
    };
}