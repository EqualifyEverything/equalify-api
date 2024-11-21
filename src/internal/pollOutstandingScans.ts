import { chunk, db, isStaging, sleep, hashStringToUuid } from '#src/utils';
import { ingestScanData } from './ingestScanData';
export const pollOutstandingScans = async ({ request, reply }) => {
    console.log(`START POLLING OPEN SCANS`);
    const startTime = new Date().getTime();
    const jobs = (await db.query({
        text: `SELECT job_id, url_id, user_id FROM scans WHERE processing = TRUE`
    })).rows;

    // make sure we sort the open jobids ASC
    const sortedJobIds = jobs.sort((a, b) => (a.job_id - b.job_id));
    let processedJobs = [];
    let failedJobs = [];
    let waitingJobs = [];
 
    for(const job of sortedJobIds){
        // check scan for result
        try{
            const scanResults = await fetch(`https://scan${isStaging ? '-dev' : ''}.equalify.app/results/${job.job_id}`, { signal: AbortSignal.timeout(10000) });
            const { result, status } = await scanResults.json();

            if (['delayed', 'active', 'waiting'].includes(status)) {
                waitingJobs.push(job.job_id)
                break; // jobIDs are processed in ascending order, so we can stop checking here
            }
            else if (['failed', 'unknown'].includes(status)) {
                await db.query(`DELETE FROM "scans" WHERE "job_id"=$1`, [job.job_id]);
                failedJobs.push(job.job_id)
            }
            else if (['completed'].includes(status)) {
                if(result == "null"){ // if result is complete but the data is empty, set processing to false;
                    await db.query({
                        text: `UPDATE "scans" SET "processing"=FALSE, "results"=$1 WHERE "job_id"=$2`,
                        values: [result, job.job_id],
                    });
                    continue;
                }
                const nodeIds = await ingestScanData( db, result, job.job_id, job.url_id, job.user_id );
                processedJobs.push(nodeIds);
            }

        } catch (err) {
            console.log(err);
        }
    }

    await db.clean();
    const deltaTime = new Date().getTime() - startTime;
    console.log(`END PROCESS SCANS, took ${deltaTime}`);
    return {
        openJobs        :sortedJobIds,
        processedJobs   : processedJobs,
        failedJobs      : failedJobs,
        waitingJobs     : waitingJobs,
        perf            : `${processedJobs.length} jobs processed, took ${deltaTime}ms`
    };
}