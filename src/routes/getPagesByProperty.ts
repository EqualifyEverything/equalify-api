import { graphql } from '#src/utils';

export const getPagesByProperty = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `
        query($property_id: uuid!,$limit: Int, $offset: Int){
            properties_by_pk(id:$property_id) {
                id
                name
                propertyUrl: property_url
                lastProcessed: last_processed
                archived
                discovery
                processed
                updatedAt: updated_at
                createdAt: created_at
                urls(limit: $limit, offset: $offset) {
                    url
                    id
                    scans(order_by: {updated_at: desc}) {
                        processing
                        updated_at
                    }
                }
                urls_aggregate {
                    aggregate {
                        count
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