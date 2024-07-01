import { db } from '#src/utils';

export const getCharts = async ({ request, reply }) => {
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows?.[0];

    const types = ['properties', 'urls', 'messages', 'nodes', 'tags'];
    const filters = Object.fromEntries(types.map(obj => [obj, []]));
    for (const type of types) {
        filters[type].push(...report.filters.filter(obj => obj.type === type).map(obj => obj.value));
    }

    const urlIds = (await db.query({
        text: `SELECT "id" FROM "urls" WHERE "id" = ANY($1::uuid[]) OR "property_id" = ANY($2::uuid[])`,
        values: [filters.urls, filters.properties],
    })).rows.map(obj => obj.id);

    const enodeIds = (await db.query({
        text: `SELECT id FROM enodes WHERE url_id = ANY($1::uuid[])`,
        values: [urlIds],
    })).rows.map(obj => obj.id);

    const enodeUpdates = (await db.query({
        text: `SELECT created_at as date, equalified FROM enode_updates WHERE enode_id = ANY($1::uuid[]) ORDER BY created_at desc`,
        values: [enodeIds],
    })).rows;

    await db.clean();
    return {
        status: 'success',
        result: enodeUpdates,
        total: enodeUpdates.length,
    };
}