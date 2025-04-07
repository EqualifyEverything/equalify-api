import { db, hashStringToUuid, normalizeHtmlWithVdom } from '#src/utils';

export const normalizeNodesForUser = async (event) => {
    await db.connect();

    const rows = (await db.query({
        text: `SELECT "id", "created_at", "html" FROM "enodes" WHERE "user_id"=$1 ORDER BY "created_at" DESC`, // AND "html_hash_id" IS NULL
        values: [event.userId],
    })).rows;
    console.log(JSON.stringify({ rowsLength: rows.length }));
    for (const row of rows) {
        // Remove all existing node updates
        await db.query({
            text: `DELETE FROM "enode_updates" WHERE "enode_id"=$1`,
            values: [row.id],
        });

        // Normalize html / hash / store
        const normalizedHtml = normalizeHtmlWithVdom(row.html);
        const htmlHashId = hashStringToUuid(normalizedHtml);
        await db.query({
            text: `UPDATE "enodes" SET "html_normalized"=$1, "html_hash_id"=$2 WHERE "id"=$3`,
            values: [normalizedHtml, htmlHashId, row.id],
        });

        // Now that we've normalized nodes, let's insert the correct node updates
        await db.query({
            text: `INSERT INTO "enode_updates" ("user_id", "created_at", "updated_at", "enode_id", "equalified") VALUES ($1, $2, $3, $4, $5)`,
            values: [event.userId, '2024-10-07', '2024-10-07', row.id, false],
        });
    }
    await db.clean();
    return;
}