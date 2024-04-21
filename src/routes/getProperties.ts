import { jwtClaims } from '../app.js';
import { pgClient } from '../utils/index.js';

export const getProperties = async ({ request, reply }) => {
    await pgClient.connect();
    await pgClient.clean();
    return;
}