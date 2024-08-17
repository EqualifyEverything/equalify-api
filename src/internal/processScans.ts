import { db, sleep } from '#src/utils';

export const processScans = async (event) => {
    console.log(`START PROCESS SCANS`);
    await db.connect();
    const scans = event.scans;
    const allNodeIds = [];
    const pollScans = (givenScans) => new Promise(async (finalRes) => {
        await sleep(2500);
        const remainingScans = [];
        await Promise.allSettled(givenScans.map(scan => new Promise(async (res) => {
            try {
                const scanResults = await fetch(`https://scan.equalify.app/results/${scan.job_id}`, { signal: AbortSignal.timeout(250) });
                const { result, status } = await scanResults.json();
                if (['delayed', 'active', 'waiting'].includes(status)) {
                    remainingScans.push(scan);
                }
                else if (['failed', 'unknown'].includes(status)) {
                    await db.query(`DELETE FROM "scans" WHERE "id"=$1`, [scan.id]);
                }
                else if (['completed'].includes(status)) {
                    const nodeIds = await scanProcessor({ result, scan });
                    allNodeIds.push(...nodeIds);
                }
            }
            catch (err) {
                remainingScans.push(scan);
            }
            res(1);
        })));
        console.log(JSON.stringify({ remainingScans: remainingScans.length }));
        if (remainingScans.length > 0) {
            await pollScans(remainingScans);
        }
        else {
            finalRes(1);
        }
        console.log(`End Reached`);
    });
    await pollScans(scans);

    // At the end of all scans, reconcile equalified nodes
    // Set node equalified to true for previous nodes associated w/ this scan!
    const userId = scans?.[0]?.user_id;
    const propertyId = scans?.[0]?.property_id;
    const allPropertyUrls = (await db.query({
        text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "property_id"=$2`,
        values: [userId, propertyId],
    })).rows;
    const equalifiedNodes = (await db.query({
        text: `SELECT "id" FROM "enodes" WHERE "equalified"=$1 AND "user_id"=$2 AND "url_id" = ANY($3)`,
        values: [false, userId, allPropertyUrls.map(obj => obj.id)],
    })).rows.filter(obj => !allNodeIds.map(obj => obj.id).includes(obj.id));

    for (const equalifiedNode of equalifiedNodes) {
        const existingNodeUpdateId = (await db.query({
            text: `SELECT "id" FROM "enode_updates" WHERE "user_id"=$1 AND "enode_id"=$2 AND "created_at"::text LIKE $3`,
            values: [userId, equalifiedNode.id, `${new Date().toISOString().split('T')[0]}%`],
        })).rows[0]?.id;
        if (existingNodeUpdateId) {
            await db.query({
                text: `UPDATE "enode_updates" SET "equalified"=$1 WHERE "id"=$2`,
                values: [true, existingNodeUpdateId],
            });
        }
        else {
            await db.query({
                text: `INSERT INTO "enode_updates" ("user_id", "enode_id", "equalified") VALUES ($1, $2, $3)`,
                values: [userId, equalifiedNode.id, true],
            });
        }
        await db.query({
            text: `UPDATE "enodes" SET "equalified" = $1 WHERE "id" = $2`,
            values: [true, equalifiedNode.id],
        });
    }

    await db.clean();
    console.log(`END PROCESS SCANS`);
    return;
}

const scanProcessor = async ({ result, scan }) => {
    // Find existing IDs for urls, messages, tags, & nodes (or create them)
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
            const existingId = (await db.query({
                text: `SELECT "id" FROM "enodes" WHERE "user_id"=$1 AND "html"=$2 AND "targets"=$3 AND "url_id"=$4`,
                values: [scan.user_id, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId)?.id],
            })).rows?.[0]?.id;

            row.id = existingId ??
                (await db.query({
                    text: `INSERT INTO "enodes" ("user_id", "html", "targets", "url_id", "equalified") VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
                    values: [scan.user_id, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId)?.id, false],
                })).rows?.[0]?.id;

            const existingNodeUpdateId = (await db.query({
                text: `SELECT "id" FROM "enode_updates" WHERE "user_id"=$1 AND "enode_id"=$2 AND "created_at"::text LIKE $3`,
                values: [scan.user_id, row.id, `${new Date().toISOString().split('T')[0]}%`],
            })).rows[0]?.id;
            if (existingNodeUpdateId) {
                await db.query({
                    text: `UPDATE "enode_updates" SET "equalified"=$1 WHERE "id"=$2`,
                    values: [false, existingNodeUpdateId],
                });
            }
            else {
                await db.query({
                    text: `INSERT INTO "enode_updates" ("user_id", "enode_id", "equalified") VALUES ($1, $2, $3)`,
                    values: [scan.user_id, row.id, false],
                });
            }

            if (existingId) {
                await db.query({
                    text: `UPDATE "enodes" SET "equalified"=$1 WHERE "id"=$2`,
                    values: [false, row.id],
                });
            }
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
            row.id = (await db.query({
                text: `SELECT "id" FROM "messages" WHERE "user_id"=$1 AND "message"=$2 AND "type"=$3`,
                values: [scan.user_id, row.message, row.type],
            })).rows?.[0]?.id ??
                (await db.query({
                    text: `INSERT INTO "messages" ("user_id", "message", "type") VALUES ($1, $2, $3) RETURNING "id"`,
                    values: [scan.user_id, row.message, row.type],
                })).rows?.[0]?.id;

            for (const relatedNodeId of row.relatedNodeIds) {
                try {
                    const messsageNodeExists = (await db.query({
                        text: `SELECT "id" FROM "message_nodes" WHERE "user_id"=$1 AND "message_id"=$2 AND "enode_id"=$3`,
                        values: [scan.user_id, row.id, result.nodes.find(obj => obj.nodeId === relatedNodeId)?.id],
                    })).rows?.[0]?.id;
                    if (!messsageNodeExists) {
                        await db.query({
                            text: `INSERT INTO "message_nodes" ("user_id", "message_id", "enode_id") VALUES ($1, $2, $3)`,
                            values: [scan.user_id, row.id, result.nodes.find(obj => obj.nodeId === relatedNodeId)?.id]
                        })
                    }
                }
                catch (err) {
                    console.log(err, `messageNode error`, JSON.stringify({ row }));
                }
            }

            for (const relatedTagId of row.relatedTagIds) {
                try {
                    const messageTagExists = (await db.query({
                        text: `SELECT "id" FROM "message_tags" WHERE "user_id"=$1 AND "message_id"=$2 AND "tag_id"=$3`,
                        values: [scan.user_id, row.id, result.nodes.find(obj => obj.nodeId === relatedTagId)?.id],
                    })).rows?.[0]?.id;
                    if (!messageTagExists) {
                        await db.query({
                            text: `INSERT INTO "message_tags" ("user_id", "message_id", "tag_id") VALUES ($1, $2, $3)`,
                            values: [scan.user_id, row.id, result.tags.find(obj => obj.tagId === relatedTagId)?.id]
                        })
                    }
                }
                catch (err) {
                    console.log(err, `messageTag error`, JSON.stringify({ row }));
                }
            }
        }
    }
    await db.query({
        text: `UPDATE "scans" SET "processing"=FALSE, "results"=$1 WHERE "id"=$2`,
        values: [result, scan.id],
    });

    return result.nodes;
}