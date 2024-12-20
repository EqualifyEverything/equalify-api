import { jwtClaims } from '#src/app';
import { db, validateUuid } from '#src/utils';

export const deletePages = async ({ request, reply }) => {
    const req = request.query;
    const theIds = JSON.parse(req.pageIds)

    if (!Array.isArray(theIds)) {
        return {
          status: "error",
          message: `${JSON.stringify(theIds)} is not an array of page IDs.`
        };
      } else {
        for (const url of theIds) {
          if (!validateUuid(url)) {
            return {
              status: "error",
              message: `${url} is not a valid page ID.`,
            };
          }
        }
      }

    await db.connect();

    let deletedIds = [];
    for (const url of theIds) {
        const deletedId = await (await db.query(`
            DELETE FROM "urls" WHERE "id"=$1 AND "user_id"=$2 RETURNING "id"
        `, [url, jwtClaims.sub])).rows.map(obj => obj.id);
        deletedIds.push(deletedId);
    };

    await db.clean();

    if (deletedIds.length === 0) {
        return {
            status: 'error',
            message: 'There was an error. No pages deleted.',
        }
    }
    else {
        return {
            status: 'success',
            message: `${deletedIds.length} pages deleted successfully.`,
            result: deletedIds,
        };
    }
}