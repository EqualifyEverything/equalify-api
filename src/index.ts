import awsLambdaFastify from "@fastify/aws-lambda";
import { fastify } from "./app.js";
import { cognito } from './cognito.js';
const proxy = awsLambdaFastify(fastify);

export async function handler(event: any, context: any) {
    if (event.triggerSource) {
        return await cognito(event);
    }
    return await proxy(event, context);
}