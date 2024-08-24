import { jwtClaims } from '#src/app';
import { db } from '#src/utils';

export const deleteUser = async ({ request, reply }) => {
    await db.connect();
    const deletedUser = (await db.query({
        text: `DELETE FROM "users" WHERE "id"=$1 RETURNING "id"`,
        values: [jwtClaims.sub],
    })).rows?.[0]?.id;
    await db.clean();
    if (deletedUser) {
        return {
            status: 'error',
            message: 'User not found',
        }
    }
    else {
        return {
            status: 'success',
            message: 'User deleted successfully',
        };
    }
}