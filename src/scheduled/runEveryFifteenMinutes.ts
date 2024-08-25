import { db, isStaging } from '#src/utils';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
const lambda = new LambdaClient();

export const runEveryFifteenMinutes = async () => {
    await db.connect();
    const pendingScans = (await db.query({
        text: `SELECT DISTINCT "user_id", "property_id" FROM "scans" WHERE "processing" = true`,
    })).rows;
    await db.clean();
    console.log(JSON.stringify({ pendingScans }));
    for (const { user_id, property_id } of pendingScans) {
        lambda.send(new InvokeCommand({
            FunctionName: `equalify-api${isStaging ? '-staging' : ''}`,
            InvocationType: "Event",
            Payload: Buffer.from(JSON.stringify({
                path: '/internal/processScans',
                userId: user_id,
                propertyId: property_id,
            })),
        }));
    }
    return;
}