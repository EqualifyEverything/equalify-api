import { graphql } from '#src/utils';

export const getUpdates = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `query($limit: Int, $offset: Int){
            updates: enode_updates_aggregate(limit: $limit, offset: $offset, ${(request.query.startDate && request.query.endDate) ? `where: {
                created_at: { _gte: "${request.query.startDate}" },
                created_at: { _lte: "${request.query.endDate}" }
            }` : ''}
                ) { 
                nodes {
                    id
                    created_at
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
        result: response?.updates?.nodes,
        total: response?.updates?.totalCount?.count,
    };
}