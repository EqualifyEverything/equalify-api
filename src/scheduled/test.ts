import { db } from '#src/utils'

export const test = async () => {
    await db.connect();
    const response = (await db.query({
        text: `SELECT "id" FROM "enodes" WHERE "equalified"=$1 AND "user_id"=$2 AND "url_id" = ANY($3) AND "id" != ANY($4)`,
        values: [false, '919ba5b0-f021-70fc-f321-9a85b6aa7746', ['9fee11b2-5125-4e6a-9248-127a784359fd'], ['61b5cafc-9fd9-4b42-9985-33dd846d0772']],
    })).rows;
    await db.clean();
    console.log(JSON.stringify({ response }));
    return;
}