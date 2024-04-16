import { graphqlQuery } from '../utils/index.js';

export const graphql = async ({ request, reply, fastify }) => {
    return await graphqlQuery({ query: request.body.query, variables: request.body.variables })
}