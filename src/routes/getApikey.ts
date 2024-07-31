import { jwtClaims } from '#src/app';
import { db, formatId } from '#src/utils';

export const getApikey = async ({ request, reply }) => {
    await db.connect();
    const apikey = (await db.query(`SELECT "apikey" FROM "users" WHERE "id" = $1`, [jwtClaims.sub])).rows?.[0]?.apikey;
    await db.clean();
    return { apikey: formatId(apikey) };
}