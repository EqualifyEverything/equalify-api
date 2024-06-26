import { jwtClaims } from '../app.js';
import { pgClient, validateDiscovery, validateDiscoveryOptions, validateUrl, validateUuid } from '../utils/index.js';

export const updateProperties = async ({ request, reply }) => {
    if (!validateUuid(request.body.propertyId)) {
        return {
            status: 'error',
            message: 'Property ID is not a valid UUID.',
        }
    }
    else if (!(request.body.propertyName || request.body.sitemapUrl || request.body.propertyDiscovery)) {
        return {
            status: 'error',
            message: 'At least propertyName, sitemapUrl, and/or propertyDiscovery are required.',
        }
    }
    else if (request.body.sitemapUrl && !validateUrl(request.body.sitemapUrl)) {
        return {
            status: 'error',
            message: 'sitemapUrl is not valid.',
        }
    }
    else if (request.body.propertyDiscovery && !validateDiscovery(request.body.propertyDiscovery)) {
        return {
            status: 'error',
            message: `propertyDiscovery is not valid- must be one of these values: ${validateDiscoveryOptions.join(', ')}`,
        }
    }

    await pgClient.connect();
    const original = (await pgClient.query(`
        SELECT * FROM "properties" WHERE "id"=$1 AND "user_id"=$2
    `, [request.body.propertyId, jwtClaims.sub]))?.rows?.[0];
    await pgClient.query(`
        UPDATE "properties" SET "name"=$1, "sitemapUrl"=$2, "discovery"=$3, "archived"=$4, "processed"=$5 WHERE "id"=$6 AND "user_id"=$7
    `, [request.body.propertyName ?? original.name, request.body.sitemapUrl ?? original.sitemapUrl, request.body.propertyDiscovery ?? original.discovery, request.body.propertyArchived ?? original.archived, request.body.propertyProcessed ?? original.processed, request.body.propertyId, jwtClaims.sub]);
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Property updated successfully',
    };
}