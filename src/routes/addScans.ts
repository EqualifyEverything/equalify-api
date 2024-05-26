import { jwtClaims } from '../app.js';
import { formatId, pgClient } from '../utils/index.js';

export const addScans = async ({ request, reply }) => {
    if (!(request.body.propertyIds || request.body.urlIds)) {
        return {
            status: 'error',
            message: 'propertyIds or urlIds required.',
        }
    }

    await pgClient.connect();
    const id = (await pgClient.query(`
        INSERT INTO "scans" ("user_id", "property_ids", "url_ids") VALUES ($1, $2, $3) RETURNING "id"
    `, [jwtClaims.sub, request.body.propertyIds, request.body.urlIds])).rows?.[0]?.id;
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Scan added successfully',
        result: formatId(id),
    };
}