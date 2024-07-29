import { jwtClaims } from '#src/app';
import { formatId, db, validateDiscovery, validateDiscoveryOptions, validateUrl } from '#src/utils';

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
    else if (!validateUrl(request.body.propertyUrl)) {
        return {
            status: 'error',
            message: 'Property URL is not valid.',
        }
    }
    else if (!validateDiscovery(request.body.propertyDiscovery)) {
        return {
            status: 'error',
            message: `Property Discovery is not valid- must be one of: ${validateDiscoveryOptions.join(', ')}`,
        }
    }

    await db.connect();
    const id = (await db.query(`
        INSERT INTO "properties" ("user_id", "name", "discovery", "property_url") VALUES ($1, $2, $3, $4) RETURNING "id"
    `, [jwtClaims.sub, request.body.propertyName, request.body.propertyDiscovery, `${request.body.propertyUrl}${!request.body.propertyUrl.endsWith('/') ? '/' : ''}`])).rows?.[0]?.id;
    await db.clean();

    return {
        status: 'success',
        message: 'Property added successfully',
        result: formatId(id),
    };
}