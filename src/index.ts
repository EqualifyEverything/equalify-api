import awsLambdaFastify from '@fastify/aws-lambda';
import { fastify } from '#src/app';
import { cognito } from '#src/cognito';
import { scheduled } from '#src/scheduled';
import { internal } from '#src/internal';
const proxy = awsLambdaFastify(fastify);

export async function handler(event: any, context: any) {
    if (event.triggerSource) {
        return await cognito(event);
    }
    else if (event.path?.startsWith('/internal')) {
        return await internal(event);
    }
    else if (event.path?.startsWith('/scheduled')) {
        return await scheduled(event);
    }
    return await proxy(event, context);
}