import { db, hashStringToUuid } from '#src/utils';

export const migrateMessagesAndTags = async () => {
    await db.connect();
    // Make sure we have distinct message/tag rows
    const distinctMessages = (await db.query(`SELECT DISTINCT "message", "type" FROM "messages"`)).rows;
    for (const row of distinctMessages) {
        const messageId = hashStringToUuid(row.message);
        try {
            await db.query({
                text: `INSERT INTO "messages" ("id","message","type") VALUES ($1, $2, $3)`,
                values: [messageId, row.message, row.type]
            });
        }
        catch (err) { }
    }
    const distinctTags = (await db.query(`SELECT DISTINCT "tag" FROM "tags"`)).rows;
    for (const row of distinctTags) {
        const tagId = hashStringToUuid(row.tag);
        try {
            await db.query({
                text: `INSERT INTO "tags" ("id","tag") VALUES ($1, $2)`,
                values: [tagId, row.tag],
            });
        }
        catch (err) { }
    }

    // Now, find all old messages and adjust.

    await db.clean();
    return;
}