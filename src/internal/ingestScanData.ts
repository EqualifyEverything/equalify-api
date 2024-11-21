import { hashStringToUuid } from '#src/utils';
/* ingests data from a scan job and adds it to the equalify database */
export const ingestScanData = async ( db, result, jobId, urlId, userId ) => {

    // Find existing IDs for urls, messages, tags, & nodes (or create them)
    if (result.nodes.length > 0) {
        
       // **** urls // Removed - all URLs should already exist in the URL table
       /*  for (const row of result.urls) {
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2`,
                    values: [userId, row.url],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "urls" ("user_id", "url", "property_id") VALUES ($1, $2, $3) RETURNING "id"`,
                    values: [userId, row.url, propertyId]
                })).rows?.[0]?.id;
        } */ 

        // **** enodes
        for (const row of result.nodes) {
            
            // see if this node matches an existing enode
            const existingId = (await db.query({
                text: `SELECT "id" FROM "enodes" WHERE "user_id"=$1 AND "html"=$2 AND "targets"=$3 AND "url_id"=$4`,
                values: [userId, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId)?.id],
            })).rows?.[0]?.id;
            
            row.id = existingId ?? 
                // if not, create the enode
                (await db.query({
                    text: `INSERT INTO "enodes" ("user_id", "html", "targets", "url_id", "equalified") VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
                    values: [userId, row.html, JSON.stringify(row.targets), result.urls.find(obj => obj.urlId === row.relatedUrlId)?.id, false],
                })).rows?.[0]?.id;
            
            // if row existed, set to not equalified
            if (existingId) {
                await db.query({
                    text: `UPDATE "enodes" SET "equalified"=$1 WHERE "id"=$2`,
                    values: [false, row.id],
                });
            }

            // **** enode_updates
            // see if this node matches an existing enode_update
            const existingNodeUpdateId = (await db.query({
                text: `SELECT "id" FROM "enode_updates" WHERE "user_id"=$1 AND "enode_id"=$2 AND "created_at"::text LIKE $3`,
                values: [userId, row.id, `${new Date().toISOString().split('T')[0]}%`],
            })).rows[0]?.id;
            // if enode_update existed, set to not equalified
            if (existingNodeUpdateId) {
                await db.query({
                    text: `UPDATE "enode_updates" SET "equalified"=$1 WHERE "id"=$2`,
                    values: [false, existingNodeUpdateId],
                });
            } else {
                //otherwise create the enode_update
                await db.query({
                    text: `INSERT INTO "enode_updates" ("user_id", "enode_id", "equalified") VALUES ($1, $2, $3)`,
                    values: [userId, row.id, false],
                });
            }

        }
        // **** tags
        for (const row of result.tags) {
            const tagId = hashStringToUuid(row.tag);
            row.id =
                (await db.query({
                    text: `SELECT "id" FROM "tags" WHERE "id"=$1`,
                    values: [tagId],
                })).rows?.[0]?.id
                ??
                (await db.query({
                    text: `INSERT INTO "tags" ("id", "tag") VALUES ($1, $2) RETURNING "id"`,
                    values: [tagId, row.tag],
                })).rows?.[0]?.id;
        }
        // **** messages
        for (const row of result.messages) {
            const messageId = hashStringToUuid(row.message);
            const existingMessageId = (await db.query({
                text: `SELECT "id" FROM "messages" WHERE "id"=$1`,
                values: [messageId],
            })).rows?.[0]?.id;
            row.id = existingMessageId ??
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

            if (!existingMessageId) {
                for (const relatedTagId of row.relatedTagIds) {
                    try {
                        await db.query({
                            text: `INSERT INTO "message_tags" ("message_id", "tag_id") VALUES ($1, $2)`,
                            values: [messageId, result.tags.find(obj => obj.tagId === relatedTagId)?.id]
                        });
                    }
                    catch (err) {
                        console.log(err, `messageTag error`, JSON.stringify({ row }));
                    }
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