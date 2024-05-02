import { jwtClaims } from '../app.js';
import { pgClient } from '../utils/index.js';

export const addProperties = async ({ request, reply }) => {
    if (!request.body.propertyName) {
        return {
            status: 'error',
            message: 'Property Name is required.',
        }
    }
    else if (!request.body.propertyUrl) {
        return {
            status: 'error',
            message: 'Property URL is required.',
        }
    }
    else if (!request.body.propertyDiscovery) {
        return {
            status: 'error',
            message: 'Property Discovery settings are required.',
        }
    }

    await pgClient.connect();
    const id = (await pgClient.query(`
        INSERT INTO "properties" ("user_id", "name", "url", "discovery") VALUES ($1, $2, $3, $4) RETURNING "id"
    `, [jwtClaims.sub, request.body.propertyName, request.body.propertyUrl, request.body.discovery])).rows?.[0]?.id;
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Property added successfully',
        result: id,
    };
}