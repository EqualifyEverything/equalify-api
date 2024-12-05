import { graphql } from '#src/utils';

export const getPage = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `query($id: uuid!){
            url_by_id(id:$id) { 
               url
               created_at
               updated_at
               property { id name }
               scans { created_at updated_at processing }
            }
        }`,
        variables: {
            id: request.query.pageId,
        },
    });

    return {
        status: 'success',
        result: response,
    };
}