import { graphql } from '#src/utils';

export const getPagesByProperty = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `
        query($id: uuid!,$limit: Int, $offset: Int){
            properties_by_pk(where: {id: {_eq:$id}}) {
               urls(limit: $limit, offset: $offset) {
                url
                id
                scans {
                    processing
                    updated_at
                }
               }
            }
        }`,
        variables: {
            id: request.query.id,
            limit: parseInt(request.query.limit ?? 50),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    return {
        status: 'success',
        result: response?.properties_by_pk.map(obj => ({
            ...obj,
        })),
    };
}