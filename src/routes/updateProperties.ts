import { jwtClaims } from '#src/app';
import { db, validateDiscovery, validateDiscoveryOptions, validateUrl, validateUuid } from '#src/utils';

export const updateProperties = async ({ request, reply }) => {
    if (!validateUuid(request.body.propertyId)) {
        return {
            status: 'error',
            message: 'Property ID is not a valid UUID.',
        }
    }
    else if (!(request.body.propertyName || request.body.propertyUrl || request.body.propertyDiscovery)) {
        return {
            status: 'error',
            message: 'At least propertyName, propertyUrl, and/or propertyDiscovery are required.',
        }
    }
    else if (request.body.propertyUrl && !validateUrl(request.body.propertyUrl)) {
        return {
            status: 'error',
            message: 'propertyUrl is not valid.',
        }
    }
    else if (request.body.propertyDiscovery && !validateDiscovery(request.body.propertyDiscovery)) {
        return {
            status: 'error',
            message: `propertyDiscovery is not valid- must be one of these values: ${validateDiscoveryOptions.join(', ')}`,
        }
    }

    await db.connect();
    const original = (await db.query(`
        SELECT * FROM "properties" WHERE "id"=$1 AND "user_id"=$2
    `, [request.body.propertyId, jwtClaims.sub]))?.rows?.[0];
    await db.query(`
        UPDATE "properties" SET "name"=$1, "propertyUrl"=$2, "discovery"=$3, "archived"=$4, "processed"=$5 WHERE "id"=$6 AND "user_id"=$7
    `, [request.body.propertyName ?? original.name, request.body.propertyUrl ?? original.propertyUrl, request.body.propertyDiscovery ?? original.discovery, request.body.propertyArchived ?? original.archived, request.body.propertyProcessed ?? original.processed, request.body.propertyId, jwtClaims.sub]);
    await db.clean();

    return {
        status: 'success',
        message: 'Property updated successfully',
    };
}