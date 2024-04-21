import { jwtClaims } from '../app.js';
import { pgClient } from '../utils/index.js';

export const getScans = async ({ request, reply }) => {
    await pgClient.connect();
    await pgClient.clean();
    return;
}