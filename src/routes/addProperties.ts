import { jwtClaims } from '../app.js';
import { formatId, pgClient, validateDiscovery, validateDiscoveryOptions, validateUrl } from '../utils/index.js';

export const addProperties = async ({ request, reply }) => {
    if (!request.body.propertyName) {
        return {
            status: 'error',
            message: 'Property Name is required.',
        }
    }
    else if (!request.body.sitemapUrl) {
        return {
            status: 'error',
            message: 'Sitemap URL is required.',
        }
    }
    else if (!request.body.propertyDiscovery) {
        return {
            status: 'error',
            message: 'Property Discovery settings are required.',
        }
    }
    else if (!validateUrl(request.body.sitemapUrl)) {
        return {
            status: 'error',
            message: 'Sitemap URL is not valid.',
        }
    }
    else if (!validateDiscovery(request.body.propertyDiscovery)) {
        return {
            status: 'error',
            message: `Property Discovery is not valid- must be one of: ${validateDiscoveryOptions.join(', ')}`,
        }
    }

    await pgClient.connect();
    const id = (await pgClient.query(`
        INSERT INTO "properties" ("user_id", "name", "sitemapUrl", "discovery") VALUES ($1, $2, $3, $4) RETURNING "id"
    `, [jwtClaims.sub, request.body.propertyName, request.body.sitemapUrl, request.body.discovery])).rows?.[0]?.id;
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Property added successfully',
        result: formatId(id),
    };
}