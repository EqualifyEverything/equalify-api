import { graphqlQuery } from '#src/utils';

export const getScans = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `query($first: Int, $offset: Int){
            scans: scansConnection(first: $first, offset: $offset, ${(request.query.scanIds) ? `filter: { id: {in: [
                        ${request.query.scanIds.split(',').map(obj => `"${obj}"`).join()}
                    ]}}` : ''}
                ) { 
                nodes {
                    id
                    createdAt
                    processing
                    jobId
                    property {
                        id
                        name
                    }
                    url {
                        id
                        url
                    }
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