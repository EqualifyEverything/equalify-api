import { jwtClaims } from '#src/app';
import { db } from '#src/utils';

export const trackUser = async ({ request, reply }) => {
    await db.connect();
    const user = (await db.query({
        text: `SELECT * FROM "users" WHERE "id"=$1`,
        values: [jwtClaims.sub],
    })).rows?.[0];

    const analytics = {
        country: request.raw.headers?.['cloudfront-viewer-country-name'],
        state: request.raw.headers?.['cloudfront-viewer-country-region-name'],
        city: request.raw.headers?.['cloudfront-viewer-city'],
        zip: request.raw.headers?.['cloudfront-viewer-postal-code'],
        ip: request.raw.headers?.['cloudfront-viewer-address'],
        device: request.raw.headers?.['cloudfront-is-desktop-viewer'] === 'true' ? 'desktop' :
            request.raw.headers?.['cloudfront-is-tablet-viewer'] === 'true' ? 'tablet' :
                request.raw.headers?.['cloudfront-is-mobile-viewer'] === 'true' ? 'mobile' : 'unknown',
        os: request.raw.headers?.['cloudfront-is-ios-viewer'] === 'true' ? 'ios' :
            request.raw.headers?.['cloudfront-is-ios-viewer'] === 'true' ? 'android' :
                request.raw.headers?.['sec-ch-ua-platform']?.replaceAll('"', ''),
    };
    await db.query(`UPDATE "users" SET "analytics"=$1 WHERE "id"=$2`, [JSON.stringify(analytics), jwtClaims.sub]);

    // Send Slack notification
    await fetch(process.env.SLACK_WEBHOOK, {
        method: 'POST',
        body: JSON.stringify({
            text: `*${user.first_name} ${user.last_name} (${user.email})* just signed up for *Equalify* from *${analytics?.city}, ${analytics?.state}* on *${analytics?.device}*`
        })
    })

    await db.clean();
    return {
        status: 'success',
        message: 'User tracked successfully',
    };
}