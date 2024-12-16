import { graphql } from '#src/utils';

export const getPagesByProperty = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `
        query($property_id: uuid!,$limit: Int, $offset: Int){
            properties_by_pk(where: {id: {_eq:$property_id}}) {
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
            property_id: request.query.property_id,
            limit: parseInt(request.query.limit ?? 50),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    return {
        status: 'success',
        result: response?.properties_by_pk,
    };
}