import { jwtClaims } from '#src/app';
import { db, validateUuid } from '#src/utils';

export const deleteReports = async ({ request, reply }) => {
    if (!request.query.reportId) {
        return {
            status: 'error',
            message: 'Report ID is required.',
        }
    }
    else if (!validateUuid(request.query.reportId)) {
        return {
            status: 'error',
            message: 'Report ID is not a valid UUID.',
        }
    }

    await db.connect();
    const deletedIds = (await db.query(`
        DELETE FROM "reports" WHERE "id"=$1 AND "user_id"=$2 RETURNING "id"
    `, [request.query.reportId, jwtClaims.sub])).rows.map(obj => obj.id);
    await db.clean();

    if (deletedIds.length === 0) {
        return {
            status: 'error',
            message: 'reportId not found, no reports deleted.',
        }
    }
    else {
        return {
            status: 'success',
            message: 'Report deletion successful',
            result: deletedIds,
        };
    }
}