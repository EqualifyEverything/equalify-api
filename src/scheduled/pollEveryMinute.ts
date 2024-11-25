import { db, isStaging } from '#src/utils';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
const lambda = new LambdaClient();

export const pollEveryMinute = async () => {
  
    lambda.send(new InvokeCommand({
        FunctionName: `equalify-api${isStaging ? '-staging' : ''}`,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({
            path: '/internal/pollOutstandingScans'
        })),
    }));
    return;
}