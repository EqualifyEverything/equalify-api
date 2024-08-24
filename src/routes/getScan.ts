import { graphql } from '#src/utils';

export const getScan = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `query($id: uuid!){
            scans_by_pk(id:$id) { 
                id
                created_at
                processing
                job_id
                results
                property { id name }
                url { id url }
            }
        }`,
        variables: {
            id: request.query.scanId,
        },
    });

    return {
        status: 'success',
        result: response?.scans_by_pk,
    };
}