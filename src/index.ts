import awsLambdaFastify from "@fastify/aws-lambda";
import { fastify } from "./app.js";
const proxy = awsLambdaFastify(fastify);

export async function handler(event: any, context: any) {
    return await proxy(event, context);
}