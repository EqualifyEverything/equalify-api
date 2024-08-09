import { graphql } from '#src/utils';

export const getScans = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `query($limit: Int, $offset: Int){
            scans: scans_aggregate(limit: $limit, offset: $offset, order_by: {created_at: asc}, ${(request.query.scanIds) ? `where: { id: {_in: [
                        ${request.query.scanIds.split(',').map(obj => `"${obj}"`).join()}
                    ]}}` : ''}
                ) { 
                nodes {
                    id
                    createdAt: created_at
                    processing
                    jobId: job_id
                    results
                    property {
                        id
                        name
                    }
                    url {
                        id
                        url
                    }
                }
                totalCount: aggregate {count}
            }
        }`,
        variables: {
            limit: parseInt(request.query.limit ?? 100),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    return {
        status: 'success',
        result: response?.scans?.nodes,
        total: response?.scans?.totalCount?.count,
    };
}