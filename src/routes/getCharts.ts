import { jwtClaims } from '#src/app';
import { db } from '#src/utils';

export const getCharts = async ({ request, reply }) => {
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows?.[0]?.filters;
    // const nodeIds = (await db.query(`SELECT "id" FROM "enodes" WHERE "user_id"=$1`, [jwtClaims.sub])).rows;
    await db.clean();
    return { report };
}