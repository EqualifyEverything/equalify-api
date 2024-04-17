import { fastify, jwtClaims } from '../app.js';
import { graphqlQuery } from '../utils/index.js';

export const getResults = async ({ request, reply }) => {
    const client = await fastify.pg.connect()
    const { rows } = await client.query(`SELECT * FROM "users"`);
    console.log(rows);
    await client.release();
    console.log(jwtClaims);
    const response = await graphqlQuery({ query: `{allUsers {nodes {name}}}` });
    return { response };
}