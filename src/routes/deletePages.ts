import { jwtClaims } from '#src/app';
import { db, validateUrl, validateUuid } from '#src/utils';

export const deletePages = async ({ request, reply }) => {
    const req = request.body;

    if (!Array.isArray(req.pageIds)) {
        return {
          status: "error",
          message: `${req.urls.stringify()} is not an array of URLs.`
        };
      } else {
        for (const url of req.pageIds) {
          if (!validateUrl(url)) {
            return {
              status: "error",
              message: `${url} is not a valid url.`,
            };
          }
        }
      }

    await db.connect();

    let deletedIds = [];
    for (const url of req.pageIds) {
        const deletedId = (await db.query(`
            DELETE FROM "urls" WHERE "id"=$1 AND "user_id"=$2 RETURNING "id"
        `, [request.query.ageId, jwtClaims.sub])).rows.map(obj => obj.id);
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