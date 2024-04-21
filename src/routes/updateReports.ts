import { jwtClaims } from '../app.js';
import { pgClient, validateUuid } from '../utils/index.js';

export const updateReports = async ({ request, reply }) => {
    await pgClient.connect();
    await pgClient.clean();
    return;
}