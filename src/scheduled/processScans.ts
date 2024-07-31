import { db } from '#src/utils';

export const processScans = async () => {
    // This route is called once every minute by Amazon EventBridge Scheduler
    await db.connect();
    const scans = (await db.query(`SELECT "id", "job_id", "property_id", "user_id" FROM "scans" WHERE "processing"=TRUE ORDER BY "created_at" DESC`)).rows;
    console.log(scans);
    await Promise.allSettled(scans.map(scan => new Promise(async (res) => {
        try {
            const scanResultsText = await fetch(`https://scan.equalify.app/results/${scan.job_id}`);
            const scanResultsTextProcessed = await scanResultsText.text();
            console.log(JSON.stringify({ scanResultsTextProcessed }));
            const scanResults = await fetch(`https://scan.equalify.app/results/${scan.job_id}`);
            const { result, status } = await scanResults.json();
            if (['delayed', 'active', 'waiting'].includes(status)) {
                console.log(`Scan ${scan.id} is ${status}- scan skipped.`);
            }
            else if (['failed', 'unknown'].includes(status)) {
                await db.query(`DELETE FROM "scans" WHERE "id"=$1`, [scan.id]);
                console.log(`Scan ${scan.id} is ${status}- scan deleted.`);
            }
            else if (['completed'].includes(status)) {
                await scanProcessor({ result, scan });
                console.log(`Scan ${scan.id} is ${status}- scan complete!`);
            }
        }
        catch (err) {
            console.log(`Scan ${scan.id} ran into an error: ${err.message}`);
        }
        res(1);
    })));
    await db.clean();
    return;
}

const scanProcessor = async ({ result, scan }) => {
    // 1. Set processing to FALSE to prevent API from accidentally re-processing the same scan
    await db.query(`UPDATE "scans" SET "processing"=FALSE, "results"=$1`, [result]);

    // 2. Find existing IDs for urls, messages, tags, & nodes (or create them)
    if (result.nodes.length > 0) {
        for (const row of result.urls) {
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2 AND "property_id"=$3`,
                    values: [scan.user_id, row.url, scan.property_id],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "urls" ("user_id", "url", "property_id") VALUES ($1, $2, $3) RETURNING "id"`,
                    values: [scan.user_id, row.url, scan.property_id]
                })).rows?.[0]?.id;
        }
        for (const row of result.nodes) {
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "enodes" WHERE "user_id"=$1 AND "html"=$2 AND "targets"=$3 AND "url_id"=$4`,
                    values: [scan.user_id, row.html, JSON.stringify(row.targets), row.url_id],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "enodes" ("user_id", "html", "targets", "url_id") VALUES ($1, $2, $3, $4) RETURNING "id"`,
                    values: [scan.user_id, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId).id],
                })).rows?.[0]?.id;
        }
        for (const row of result.tags) {
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "tags" WHERE "user_id"=$1 AND "tag"=$2`,
                    values: [scan.user_id, row.tag],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "tags" ("user_id", "tag") VALUES ($1, $2) RETURNING "id"`,
                    values: [scan.user_id, row.tag],
                })).rows?.[0]?.id;
        }
        for (const row of result.messages) {
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "messages" WHERE "user_id"=$1 AND "message"=$2 AND "type"=$3`,
                    values: [scan.user_id, row.message, row.type],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "messages" ("user_id", "message", "type") VALUES ($1, $2, $3) RETURNING "id"`,
                    values: [scan.user_id, row.message, row.type],
                })).rows?.[0]?.id;

            for (const relatedNodeId of row.relatedNodeIds) {
                await db.query({
                    text: `INSERT INTO "message_nodes" ("user_id", "message_id", "enode_id") VALUES ($1, $2, $3)`,
                    values: [scan.user_id, row.id, result.nodes.find(obj => obj.nodeId === relatedNodeId).id]
                })
            }
            for (const relatedTagId of row.relatedTagIds) {
                await db.query({
                    text: `INSERT INTO "message_tags" ("user_id", "message_id", "tag_id") VALUES ($1, $2, $3)`,
                    values: [scan.user_id, row.id, result.tags.find(obj => obj.tagId === relatedTagId).id]
                })
            }
        }
    }

    // 4. Delete the scan and move on!
    // await db.query(`DELETE FROM "scans" WHERE "id"=$1`, [scan.id]);
    return;
}