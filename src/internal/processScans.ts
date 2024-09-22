import { chunk, db, isStaging, sleep } from '#src/utils';
import { hashStringToUuid } from '#src/utils/hashStringToUuid';

export const processScans = async (event) => {
    console.log(`START PROCESS SCANS`);
    const startTime = new Date().getTime();
    await db.connect();
    const { userId, propertyId, discovery } = event;
    const jobIds = (await db.query({
        text: `SELECT s.job_id FROM scans as s INNER JOIN properties AS p ON s.property_id = p.id WHERE s.user_id=$1 AND s.property_id=$2 AND s.processing = TRUE AND p.discovery=$3`,
        values: [userId, propertyId, discovery],
    })).rows.map(obj => obj.job_id);
    const allNodeIds = [];
    const pollScans = (givenJobIds) => new Promise(async (finalRes) => {
        await sleep(1000);
        const remainingScans = [];
        const batchesOfJobIds = chunk(givenJobIds, 25);
        for (const [index, batchOfJobIds] of batchesOfJobIds.entries()) {
            console.log(`Start ${index} of ${batchesOfJobIds.length} batches`);
            await Promise.allSettled(batchOfJobIds.map(jobId => new Promise(async (res) => {
                try {
                    const scanResults = await fetch(`https://scan${isStaging ? '-dev' : ''}.equalify.app/results/${jobId}`, { signal: AbortSignal.timeout(10000) });
                    const { result, status } = await scanResults.json();
                    if (['delayed', 'active', 'waiting'].includes(status)) {
                        remainingScans.push(jobId);
                    }
                    else if (['failed', 'unknown'].includes(status)) {
                        await db.query(`DELETE FROM "scans" WHERE "job_id"=$1`, [jobId]);
                    }
                    else if (['completed'].includes(status)) {
                        const nodeIds = await scanProcessor({ result, jobId, userId, propertyId });
                        allNodeIds.push(...nodeIds);
                    }
                }
                catch (err) {
                    console.log(err);
                    remainingScans.push(jobId);
                }
                res(1);
            })));
        }
        const stats = { userId, remainingScans: remainingScans.length };
        console.log(JSON.stringify(stats));
        if (remainingScans.length > 0) {
            const currentTime = new Date().getTime();
            const deltaTime = currentTime - startTime;
            const tenMinutes = 10 * 60 * 1000;
            if (deltaTime <= tenMinutes) {
                await pollScans(remainingScans);
            }
            else if (deltaTime > tenMinutes) {
                const scansExist = (await db.query({
                    text: `SELECT "id" FROM "scans" WHERE "job_id" = ANY($1) LIMIT 1`,
                    values: [jobIds],
                })).rows?.[0]?.id;
                if (scansExist) {
                    const message = `10 minutes reached, terminating processScans early`;
                    console.log(JSON.stringify({ message, ...stats }));
                    throw new Error(message);
                }
            }
        }
        else {
            finalRes(1);
        }
    });
    await pollScans(jobIds);

    // At the end of all scans, reconcile equalified nodes
    // Set node equalified to true for previous nodes associated w/ this scan!
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

const scanProcessor = async ({ result, jobId, userId, propertyId }) => {
    // Find existing IDs for urls, messages, tags, & nodes (or create them)
    if (result.nodes.length > 0) {
        for (const row of result.urls) {
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2 AND "property_id"=$3`,
                    values: [userId, row.url, propertyId],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "urls" ("user_id", "url", "property_id") VALUES ($1, $2, $3) RETURNING "id"`,
                    values: [userId, row.url, propertyId]
                })).rows?.[0]?.id;
        }
        for (const row of result.nodes) {
            const existingId = (await db.query({
                text: `SELECT "id" FROM "enodes" WHERE "user_id"=$1 AND "html"=$2 AND "targets"=$3 AND "url_id"=$4`,
                values: [userId, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId)?.id],
            })).rows?.[0]?.id;

            row.id = existingId ??
                (await db.query({
                    text: `INSERT INTO "enodes" ("user_id", "html", "targets", "url_id", "equalified") VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
                    values: [userId, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId)?.id, false],
                })).rows?.[0]?.id;

            const existingNodeUpdateId = (await db.query({
                text: `SELECT "id" FROM "enode_updates" WHERE "user_id"=$1 AND "enode_id"=$2 AND "created_at"::text LIKE $3`,
                values: [userId, row.id, `${new Date().toISOString().split('T')[0]}%`],
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
                    values: [userId, row.id, false],
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
            const tagId = hashStringToUuid(row.tag);
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "tags" WHERE "tag"=$1`,
                    values: [tagId],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "tags" ("id", "tag") VALUES ($1, $2) RETURNING "id"`,
                    values: [tagId, row.tag],
                })).rows?.[0]?.id;
        }
        for (const row of result.messages) {
            const messageId = hashStringToUuid(row.message);
            row.id = (await db.query({
                text: `SELECT "id" FROM "messages" WHERE "id"=$1`,
                values: [messageId],
            })).rows?.[0]?.id ??
                (await db.query({
                    text: `INSERT INTO "messages" ("id", "message", "type") VALUES ($1, $2, $3) RETURNING "id"`,
                    values: [messageId, row.message, row.type],
                })).rows?.[0]?.id;

            for (const relatedNodeId of row.relatedNodeIds) {
                try {
                    const messsageNodeExists = (await db.query({
                        text: `SELECT "id" FROM "message_nodes" WHERE "user_id"=$1 AND "message_id"=$2 AND "enode_id"=$3`,
                        values: [userId, row.id, result.nodes.find(obj => obj.nodeId === relatedNodeId)?.id],
                    })).rows?.[0]?.id;
                    if (!messsageNodeExists) {
                        await db.query({
                            text: `INSERT INTO "message_nodes" ("user_id", "message_id", "enode_id") VALUES ($1, $2, $3)`,
                            values: [userId, row.id, result.nodes.find(obj => obj.nodeId === relatedNodeId)?.id]
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
                        values: [userId, row.id, result.nodes.find(obj => obj.nodeId === relatedTagId)?.id],
                    })).rows?.[0]?.id;
                    if (!messageTagExists) {
                        await db.query({
                            text: `INSERT INTO "message_tags" ("user_id", "message_id", "tag_id") VALUES ($1, $2, $3)`,
                            values: [userId, row.id, result.tags.find(obj => obj.tagId === relatedTagId)?.id]
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
        text: `UPDATE "scans" SET "processing"=FALSE, "results"=$1 WHERE "job_id"=$2`,
        values: [result, jobId],
    });

    return result.nodes;
}