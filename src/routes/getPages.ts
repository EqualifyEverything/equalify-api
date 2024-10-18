import { graphql } from '#src/utils';

export const getPages = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `
                query($limit: Int, $offset: Int){
                urls(limit: $limit, offset: $offset, order_by: {updated_at: desc}) {
                        url
                        property {
                            id
                            name
                        }
                        scans {
                            updated_at
                        }
                    }
                }
        `,
        variables: {
            limit: parseInt(request.query.limit ?? 50),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    return {
        status: 'success',
        result: response.map(
            ({
                url,
                id, 
                property:
                { 
                    id:property_id, 
                    name:property_name 
                }, 
                scans:
                {
                    updated_at:last_scanned
                }
            })=>({ url, id, property_name, property_id, last_scanned })),
        total: response?.count,
    };
}