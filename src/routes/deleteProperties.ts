import { jwtClaims } from '#src/app';
import { pgClient, validateUuid } from '#src/utils';

export const deleteProperties = async ({ request, reply }) => {
    if (!request.query.propertyId) {
        return {
            status: 'error',
            message: 'Property ID is required.',
        }
    }
    else if (!validateUuid(request.query.propertyId)) {
        return {
            status: 'error',
            message: 'Property ID is not a valid UUID.',
        }
    }

    await pgClient.connect();
    const deletedIds = (await pgClient.query(`
        DELETE FROM "properties" WHERE "id"=$1 AND "user_id"=$2 RETURNING "id"
    `, [request.query.propertyId, jwtClaims.sub])).rows.map(obj => obj.id);
    await pgClient.clean();

    if (deletedIds.length === 0) {
        return {
            status: 'error',
            message: 'propertyId not found, no properties deleted',
        }
    }
    else {
        return {
            status: 'success',
            message: 'Property deletion successful',
            result: deletedIds,
        };
    }
}