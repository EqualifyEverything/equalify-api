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
        UPDATE "reports" SET "name"=$1, "filters"=$2, "cache_date"=$3 WHERE "id"=$4 AND "user_id"=$5
    `, [request.body.reportName ?? original.name, JSON.stringify(request.body.reportFilters ?? original.filters), new Date(), request.body.reportId, jwtClaims.sub]);
    await db.clean();

    return {
        status: 'success',
        message: 'Report updated successfully',
    };
}