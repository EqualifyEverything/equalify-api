import { jwtClaims } from '#src/app';
import { db } from '#src/utils';

export const adminClearCache = async ({ request, reply }) => {
    const adminIds = JSON.parse(process.env.ADMIN_IDS);
    if (adminIds.includes(jwtClaims.sub)) {
        await db.connect();
        await db.query({
            text: `UPDATE "reports" SET "cache_date"=$1 WHERE "user_id"=$2`,
            values: ['2025-01-01', jwtClaims.sub],
        })
        await db.clean();
        return { success: true };
    }
    else {
        return { success: false };
    }
}