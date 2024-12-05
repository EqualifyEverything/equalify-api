import { graphql } from '#src/utils';

export const getPage = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `
        query($id: uuid!){
            urls_by_pk(id:$id) {
               updated_at
               url
               id
               created_at
               property { 
                    id 
                    name 
                }
               scans { 
                    id 
                    created_at 
                    updated_at 
                    processing 
                }
            }
        }`,
        variables: {
            id: request.query.pageId,
        },
    });

    return {
        status: 'success',
        result: response?.urls_by_pk,
    };
}