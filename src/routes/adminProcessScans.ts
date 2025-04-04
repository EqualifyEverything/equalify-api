import { jwtClaims } from '#src/app';
import { runEveryFifteenMinutes } from '#src/scheduled/runEveryFifteenMinutes';

export const adminProcessScans = async ({ request, reply }) => {
    const adminIds = JSON.parse(process.env.ADMIN_IDS);
    if (adminIds.includes(jwtClaims.sub)) {
        await runEveryFifteenMinutes();
        return { success: true };
    }
    else {
        return { success: false };
    }
}