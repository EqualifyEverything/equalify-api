import { jwtClaims } from '#src/app';
import { db, validateUrl } from '#src/utils';

export const addScans = async ({ request, reply }) => {
    if (!(request.body.propertyIds || request.body.urlIds)) {
        return {
            status: 'error',
            message: 'PropertyIds and/or urlIds are required.',
        }
    }

    await db.connect();
    for (const propertyId of request.body.propertyIds ?? []) {
        const propertyDiscovery = (await db.query(`SELECT "discovery" FROM "properties" WHERE "id"=$1`, [propertyId])).rows?.[0]?.discovery;
        if (!propertyDiscovery) {
            return {
                status: 'error',
                message: 'One or more of the provided propertyIds is invalid',
            }
        }
        const urls = (await db.query(`SELECT "id", "url" FROM "urls" WHERE "property_id"=$1`, [propertyId])).rows;
        for (const { id, url } of urls) {
            try {
                if (!validateUrl(url)) {
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

                    const scanResponse = await (await fetch(`https://scan.equalify.app/generate/${discoveryDict?.[propertyDiscovery] ?? 'url'}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: (propertyDiscovery === 'sitemap' && !url.endsWith('.xml')) ? `${url}/sitemap.xml` : url })
                    })).json();
                    console.log(JSON.stringify({ scanResponse }));

                    for (const { jobId, url } of scanResponse?.jobs ?? []) {
                        const urlId = (await db.query({
                            text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2 AND "property_id"=$3`,
                            values: [jwtClaims.sub, url, propertyId],
                        })).rows?.[0]?.id ?? (await db.query({
                            text: `INSERT INTO "urls" ("user_id", "url", "property_id") VALUES ($1, $2, $3) RETURNING "id"`,
                            values: [jwtClaims.sub, url, propertyId]
                        })).rows?.[0]?.id;

                        await db.query({
                            text: `INSERT INTO "scans" ("user_id", "property_id", "url_id", "job_id") VALUES ($1, $2, $3, $4) RETURNING "id"`,
                            values: [jwtClaims.sub, propertyId, urlId, parseInt(jobId)]
                        });
                    }
                }
            }
            catch (err) {
                console.log(err);
            }
        }
    }
    await db.clean();

    return {
        status: 'success',
        message: 'Scans successfully queued',
    };
}