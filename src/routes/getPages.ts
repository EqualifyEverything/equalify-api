import { graphql } from '#src/utils';

export const getPages = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `
                query($limit: Int, $offset: Int){
                urls(limit: $limit, offset: $offset, order_by: {updated_at: desc}) {
                        url
                        id
                        property {
                            id
                            name
                        }
                        scans {
                            updated_at
                            processing
                        }
                    }
                    totalCount: aggregate {count}
                }
        `,
        variables: {
            limit: parseInt(request.query.limit ?? 50),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    return {
        status: 'success',
        result: response?.urls?.map(obj => ({
            ...obj,
        })),
        total: response?.urls?.totalCount?.count,
    };
}