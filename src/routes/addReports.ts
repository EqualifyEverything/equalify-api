import { jwtClaims } from '#src/app';
import { formatId, pgClient } from '#src/utils';

export const addReports = async ({ request, reply }) => {
    if (!request.body.reportName) {
        return {
            status: 'error',
            message: 'Report Name is required.',
        }
    }
    else if (!request.body.reportFilters) {
        return {
            status: 'error',
            message: 'Report filters are required.',
        }
    }

    await pgClient.connect();
    const id = (await pgClient.query(`
        INSERT INTO "reports" ("user_id", "name", "filters") VALUES ($1, $2, $3) RETURNING "id"
    `, [jwtClaims.sub, request.body.reportName, request.body.reportFilters])).rows?.[0]?.id;
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Report added successfully',
        result: formatId(id),
    };
}