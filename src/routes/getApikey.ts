import { jwtClaims } from '#src/app';
import { db, formatId } from '#src/utils';

export const getApikey = async ({ request, reply }) => {
    await db.connect();
    const { id, apikey } = (await db.query(`SELECT "id", "apikey" FROM "users" WHERE "id" = $1`, [jwtClaims.sub])).rows?.[0];
    await db.clean();
    const adminIds = JSON.parse(process.env.ADMIN_IDS);
    return { apikey: formatId(apikey), isAdmin: adminIds.includes(id) };
}