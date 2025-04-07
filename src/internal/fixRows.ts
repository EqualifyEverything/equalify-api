import { chunk, db, dbRestore } from '#src/utils';

export const fixRows = async (event) => {
    const { userId } = event;

    await dbRestore.connect();
    const oldRows = (await dbRestore.query({
        text: `SELECT "id", "created_at", "url_id", "html", "targets" FROM "enodes" WHERE "user_id"=$1 ORDER BY "created_at" DESC`,
        values: [userId],
    })).rows;
    await dbRestore.clean();

    await db.connect();
    await Promise.all(chunk(oldRows, 1000).map(async (chunkOfRows) => {
        await db.query(`INSERT INTO "enodes" ("id", "created_at", "updated_at", "user_id", "url_id", "equalified", "html", "targets") VALUES ${chunkOfRows.map(row => `(
            '${row.id}',
            '${row.created_at.toISOString()}',
            '${row.created_at.toISOString()}',
            '${userId}',
            '${row.url_id}',
            false,
            '${escapeSqlString(row.html)}',
            '${escapeSqlString(JSON.stringify(row.targets))}'
        )`).join()} ON CONFLICT DO NOTHING`);
    }));
    await db.clean();

    return;
}

const escapeSqlString = (value) => {
    if (value === null || typeof value === 'undefined') {
        return 'NULL';
    }
    return String(value).replace(/'/g, "''");
}