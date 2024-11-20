import { chunk, db, isStaging, sleep, hashStringToUuid } from '#src/utils';
import { ingestScanData } from './ingestScanData';
export const pollOutstandingScans = async ({ request, reply }) => {
    console.log(`START POLLING OPEN SCANS`);
    const startTime = new Date().getTime();
    const jobIds = (await db.query({
        text: `SELECT job_id, url_id FROM scans WHERE processing = TRUE`
    })).rows.map(obj => {obj.job_id, obj.url_id});

    // make sure we sort the open jobids ASC
    const sortedJobIds = jobIds.jobIds.sort((a, b) => (a - b));
    return sortedJobIds;

    for(const jobId of sortedJobIds){
        // check scan for result
        try{
            const scanResults = await fetch(`https://scan${isStaging ? '-dev' : ''}.equalify.app/results/${jobId}`, { signal: AbortSignal.timeout(10000) });
            const { result, status } = await scanResults.json();

            // jobIDs are processed in ascending order, so we can stop checking here
            if (['delayed', 'active', 'waiting'].includes(status)) {
                break;
            }
            else if (['failed', 'unknown'].includes(status)) {
                await db.query(`DELETE FROM "scans" WHERE "job_id"=$1`, [jobId]);
            }
            else if (['completed'].includes(status)) {
                const nodeIds = await ingestScanData({ result, jobId });
            }

        } catch (err) {
            console.log(err);
        }
    }

    await db.clean();
    const deltaTime = new Date().getTime() - startTime;
    console.log(`END PROCESS SCANS, took ${deltaTime}`);
    return {
        sortedJobIds
    };
}