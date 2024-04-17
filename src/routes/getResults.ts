import { jwtClaims } from '../app.js';
import { graphqlQuery, pgClient } from '../utils/index.js';

export const getResults = async ({ request, reply }) => {
    await pgClient.connect();
    const { rows } = await pgClient.query(`SELECT * FROM "users"`);
    console.log(rows);
    await pgClient.clean();
    console.log(jwtClaims);
    const response = await graphqlQuery({ query: `{allUsers {nodes {name}}}` });
    return { response };
}