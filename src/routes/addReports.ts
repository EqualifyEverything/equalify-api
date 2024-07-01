import { jwtClaims } from '#src/app';
import { formatId, db } from '#src/utils';

export const addReports = async ({ request, reply }) => {
    if (!request.body.reportName) {
        return {
            status: 'error',
            message: 'Report Name is required.',
        }
    }
    else if (!request.body.filters) {
        return {
            status: 'error',
            message: 'Report filters are required.',
        }
    }

    await db.connect();
    const id = (await db.query(`
        INSERT INTO "reports" ("user_id", "name", "filters") VALUES ($1, $2, $3) RETURNING "id"
    `, [jwtClaims.sub, request.body.reportName, JSON.stringify(request.body.filters ?? [])])).rows?.[0]?.id;
    await db.clean();

    return {
        status: 'success',
        message: 'Report added successfully',
        result: formatId(id),
    };
}