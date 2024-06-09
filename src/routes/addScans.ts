import { jwtClaims } from 'app.js';
import { pgClient, validateUrl } from '../utils/index.js';

export const addScans = async ({ request, reply }) => {
    if (!(request.body.propertyIds || request.body.urlIds)) {
        return {
            status: 'error',
            message: 'PropertyIds and/or urlIds are required.',
        }
    }

    await pgClient.connect();
    for (const propertyId of request.body.propertyIds ?? []) {
        const propertyExists = (await pgClient.query(`SELECT "id" FROM "properties" WHERE "id"=$1`, [propertyId])).rows?.[0]?.id;
        if (!propertyExists) {
            return {
                status: 'error',
                message: 'One or more of the provided propertyIds is invalid',
            }
        }

        const urls = (await pgClient.query(`SELECT "id", "url" FROM "urls" WHERE "property_id"=$1`, [propertyId])).rows;
        for (const { id, url } of urls) {
            if (!validateUrl(url)) {
                return {
                    status: 'error',
                    message: 'One or more of the provided propertyIds has an invalid url',
                }
            }
            else {
                console.log(JSON.stringify({ url }));
                const scanResponse = await (await fetch(`https://scan.equalify.app/generate/url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                })).json();
                console.log(JSON.stringify({ scanResponse }));
                await pgClient.query(`
                    INSERT INTO "scans" ("user_id", "property_id", "url_id", "job_id") VALUES ($1, $2, $3, $4) RETURNING "id"
                `, [jwtClaims.sub, propertyId, id, parseInt(scanResponse?.jobID)]);
            }
        }
    }
    for (const urlId of request.body.urlIds ?? []) {
        const url = (await pgClient.query(`SELECT "url" FROM "urls" WHERE "id"=$1`, [urlId])).rows?.[0]?.url;
        if (!url) {
            return {
                status: 'error',
                message: 'One or more of the provided urlIds is invalid',
            }
        }
        else if (!validateUrl(url)) {
            return {
                status: 'error',
                message: 'One or more of the provided urlIds is invalid',
            }
        }
        else {
            const jobId = (await (await fetch(`https://scan.equalify.app/generate/url`, { method: 'POST', body: JSON.stringify({ url }) })).json())?.jobID;
            await pgClient.query(`
                INSERT INTO "scans" ("user_id", "url_id", "job_id") VALUES ($1, $2, $3) RETURNING "id"
            `, [jwtClaims.sub, urlId, jobId]);
        }
    }
    await pgClient.clean();

    return {
        status: 'success',
        message: 'Scans successfully queued',
    };
}