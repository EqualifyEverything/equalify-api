import { jwtClaims } from '#src/app';
import { db, validateUuid } from '#src/utils';

export const updateReports = async ({ request, reply }) => {
    if (!validateUuid(request.body.reportId)) {
        return {
            status: 'error',
            message: 'Report ID is not a valid UUID.',
        }
    }
    else if (!(request.body.reportName || request.body.reportFilters)) {
        return {
            status: 'error',
            message: 'At least reportName and/or reportFilters are required.',
        }
    }

    await db.connect();
    const original = (await db.query(`
        SELECT * FROM "reports" WHERE "id"=$1 AND "user_id"=$2
    `, [request.body.reportId, jwtClaims.sub]))?.rows?.[0];
    await db.query(`
        UPDATE "reports" SET "name"=$1, "filters"=$2 WHERE "id"=$3 AND "user_id"=$4
    `, [request.body.reportName ?? original.name, request.body.reportFilters ?? original.url, request.body.reportId, jwtClaims.sub]);
    await db.clean();

    return {
        status: 'success',
        message: 'Report updated successfully',
    };
}