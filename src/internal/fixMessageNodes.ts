import { chunk, db, dbRestore } from '#src/utils';

export const fixMessageNodes = async (event) => {
    const { userId } = event;

    await dbRestore.connect();
    const oldRows = (await dbRestore.query({
        text: `SELECT "id", "message_id", "enode_id" FROM "message_nodes" WHERE "user_id"=$1 ORDER BY "id" DESC`,
        values: [userId],
    })).rows;
    await dbRestore.clean();

    await db.connect();
    const currentNodeIds = (await db.query({
        text: `SELECT "id" FROM "enodes" WHERE "user_id"=$1 ORDER BY "created_at" DESC`,
        values: [userId],
    })).rows.map(obj => obj.id);

    const filteredRows = oldRows.filter(obj => currentNodeIds.includes(obj.enode_id))

    await Promise.all(chunk(filteredRows, 1000).map(async (chunkOfRows) => {
        await db.query(`INSERT INTO "message_nodes" ("id", "message_id", "enode_id", "user_id") VALUES ${chunkOfRows.map(row => `(
            '${row.id}',
            '${row.message_id}',
            '${row.enode_id}',
            '${userId}'
        )`).join()} ON CONFLICT DO NOTHING`);
    }));
    await db.clean();

    return;
}