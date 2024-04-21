import { jwtClaims } from '../app.js';
import { pgClient, validateUuid } from '../utils/index.js';

export const addResults = async ({ request, reply }) => {
    await pgClient.connect();
    await pgClient.clean();
    return;
}