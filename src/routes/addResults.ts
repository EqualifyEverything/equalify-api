import { jwtClaims } from '../app.js';
import { formatId, pgClient } from '../utils/index.js';

export const addResults = async ({ request, reply }) => {
    await pgClient.connect();
    const id = (await pgClient.query(`
        INSERT INTO "results" ("user_id") VALUES ($1) RETURNING "id"
    `, [jwtClaims.sub])).rows?.[0]?.id;
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Result added successfully',
        result: formatId(id),
    };
}