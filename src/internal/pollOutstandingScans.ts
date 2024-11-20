import { chunk, db, isStaging, sleep, hashStringToUuid } from '#src/utils';
export const pollOutstandingScans = async () => {
    console.log(`START POLLING OPEN SCANS`);
    const startTime = new Date().getTime();
    const jobIds = (await db.query({
        text: `SELECT s.job_id FROM scans WHERE s.processing = TRUE`
    })).rows.map(obj => obj.job_id);
    await db.clean();
    const deltaTime = new Date().getTime() - startTime;
    console.log(`END PROCESS SCANS, took ${deltaTime}`);
    return;
}