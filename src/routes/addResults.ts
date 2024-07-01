import { jwtClaims } from '#src/app';
import { formatId, db } from '#src/utils';

export const addResults = async ({ request, reply }) => {
    await db.connect();
    const id = (await db.query(`
        INSERT INTO "results" ("user_id") VALUES ($1) RETURNING "id"
    `, [jwtClaims.sub])).rows?.[0]?.id;
    await db.clean();

    return {
        status: 'success',
        message: 'Result added successfully',
        result: formatId(id),
    };
}