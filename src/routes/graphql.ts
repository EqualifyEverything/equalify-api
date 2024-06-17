import { graphqlQuery } from '#src/utils';

export const graphql = async ({ request, reply }) => {
    try {
        return await graphqlQuery({ query: request.body.query, variables: request.body.variables })
    }
    catch (err) {
        console.log(err);
        return;
    }
}