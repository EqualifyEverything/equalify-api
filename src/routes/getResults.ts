import { graphqlQuery } from '../utils/index.js';

export const getResults = async ({ request, reply, fastify }) => {
    // const client = await fastify.pg.connect()
    // const { rows } = await client.query(`SELECT * FROM "users"`);
    // console.log(rows);
    // await client.release();
    // console.log(request, reply);
    const response = await graphqlQuery({ query: `{allUsers {nodes {name}}}`, variables: null, operationName: null, userId: null });
    return { response };
}