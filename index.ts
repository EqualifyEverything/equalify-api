import awsLambdaFastify from "@fastify/aws-lambda";
import { app } from "./app";

const proxy = awsLambdaFastify(app);

export async function handler(event: any, context: any) {
    return await proxy(event, context);
}