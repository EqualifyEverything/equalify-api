import { pgClient } from 'utils';

export const processScans = async () => {
    await pgClient.connect();
    const scans = (await pgClient.query(`SELECT "id", "job_id" FROM "scans" WHERE "processing"=TRUE ORDER BY "created_at" DESC`)).rows;
    for (const scan of scans) {
        const response = await (await fetch(`https://scan.equalify.app/results/${scan.job_id}`)).json();
        if (response?.status === 'completed') {
            await pgClient.query(`UPDATE "scans" SET "processing"=FALSE, "results"=$1`, [response?.result]);
        }
    }
    await pgClient.clean();
    return;
}