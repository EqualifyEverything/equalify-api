import { jwtClaims } from '../app.js';
import { pgClient, validateUuid } from '../utils/index.js';

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

    await pgClient.connect();
    const original = (await pgClient.query(`
        SELECT * FROM "reports" WHERE "id"=$1 AND "user_id"=$2
    `, [request.body.reportId, jwtClaims.sub]))?.rows?.[0];
    await pgClient.query(`
        UPDATE "reports" SET "name"=$1, "filters"=$2 WHERE "id"=$3 AND "user_id"=$4
    `, [request.body.reportName ?? original.name, request.body.reportFilters ?? original.url, request.body.reportId, jwtClaims.sub]);
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Report updated successfully',
    };
}