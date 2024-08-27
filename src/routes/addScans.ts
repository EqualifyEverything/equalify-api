import { jwtClaims } from '#src/app';
import { db, isStaging, validateUrl } from '#src/utils';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
const lambda = new LambdaClient();

export const addScans = async ({ request, reply }) => {
    if (!(request.body.propertyIds || request.body.urlIds)) {
        return {
            status: 'error',
            message: 'PropertyIds and/or urlIds are required.',
        }
    }

    await db.connect();
    for (const propertyId of request.body.propertyIds ?? []) {
        const property = (await db.query(`SELECT "id", "discovery", "property_url" FROM "properties" WHERE "id"=$1`, [propertyId])).rows?.[0];
        if (!property.discovery) {
            return {
                status: 'error',
                message: 'One or more of the provided propertyIds is invalid',
            }
        }
        try {
            if (!validateUrl(property.property_url)) {
                return {
                    status: 'error',
                    message: 'One or more of the provided propertyIds has an invalid url',
                }
            }
            else {
                const discoveryDict = {
                    single: 'url',
                    sitemap: 'sitemapurl',
                }

                const scanResponse = await (await fetch(`https://scan${isStaging ? '-dev' : ''}.equalify.app/generate/${discoveryDict?.[property.discovery] ?? 'url'}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: property.property_url, userId: jwtClaims.sub })
                })).json();
                // console.log(JSON.stringify({ scanResponse }));

                for (const { jobId, url } of scanResponse?.jobs ?? []) {
                    const urlId = (await db.query({
                        text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2 AND "property_id"=$3`,
                        values: [jwtClaims.sub, url, propertyId],
                    })).rows?.[0]?.id ?? (await db.query({
                        text: `INSERT INTO "urls" ("user_id", "url", "property_id") VALUES ($1, $2, $3) RETURNING "id"`,
                        values: [jwtClaims.sub, url, propertyId]
                    })).rows?.[0]?.id;

                    const scan = (await db.query({
                        text: `INSERT INTO "scans" ("user_id", "property_id", "url_id", "job_id") VALUES ($1, $2, $3, $4) RETURNING "job_id"`,
                        values: [jwtClaims.sub, propertyId, urlId, parseInt(jobId)]
                    })).rows[0];
                }
            }
        }
        catch (err) {
            console.log(err);
        }
        // lambda.send(new InvokeCommand({
        //     FunctionName: `equalify-api${isStaging ? '-staging' : ''}`,
        //     InvocationType: "Event",
        //     Payload: Buffer.from(JSON.stringify({
        //         path: '/internal/processScans',
        //         userId: jwtClaims.sub,
        //         propertyId: propertyId,
        //     })),
        // }));
    }
    await db.clean();

    return {
        status: 'success',
        message: 'Scans successfully queued',
    };
}
