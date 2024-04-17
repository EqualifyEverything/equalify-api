import Fastify from 'fastify';
import fastifyPg from '@fastify/postgres';
import { getResults, graphql } from './routes/index.js';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
export const fastify = Fastify({ logger: true });
export const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.WEB_CLIENT_ID,
    tokenUse: 'access',
});
export const jwtClaims = { sub: null };

fastify.addHook('preHandler', async (request, reply) => {
    try {
        jwtClaims.sub = (await cognitoJwtVerifier.verify(request.headers.authorization?.replace('Bearer ', '')))?.sub;
    }
    catch (err) {
        console.log(err);
        reply.code(401).send({ message: `Error: You must include an Authorization header with a valid JWT token` });
    }
})

fastify.register(fastifyPg, { connectionString: process.env.DB_CONNECTION_URL });
fastify.post('/graphql', {}, async (request, reply) => graphql({ request, reply }));
fastify.get('/get/results', {}, async (request, reply) => getResults({ request, reply }));

fastify.listen({ port: 3000 }, (err) => {
    console.log(`Server listening on ${fastify.server.address().port}`)
    if (err) throw err
})