import Fastify from 'fastify';
import { addProperties, addReports, addResults, addScans, deleteProperties, deleteReports, getProperties, getReports, getResults, getScans, getUpdates, graphql, help, updateProperties, updateReports } from './routes/index.js';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
export const fastify = Fastify({ logger: true });
const cognitoJwtVerifier = CognitoJwtVerifier.create({
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

// GET requests
fastify.get('/get/results', {}, async (request, reply) => getResults({ request, reply }));
fastify.get('/get/properties', {}, async (request, reply) => getProperties({ request, reply }));
fastify.get('/get/updates', {}, async (request, reply) => getUpdates({ request, reply }));
fastify.get('/get/scans', {}, async (request, reply) => getScans({ request, reply }));
fastify.get('/get/reports', {}, async (request, reply) => getReports({ request, reply }));

// POST requests
fastify.post('/add/results', {}, async (request, reply) => addResults({ request, reply }));
fastify.post('/add/scans', {}, async (request, reply) => addScans({ request, reply }));
fastify.post('/add/reports', {}, async (request, reply) => addReports({ request, reply }));
fastify.post('/add/properties', {}, async (request, reply) => addProperties({ request, reply }));

// PUT requests
fastify.put('/update/properties', {}, async (request, reply) => updateProperties({ request, reply }));
fastify.put('/update/reports', {}, async (request, reply) => updateReports({ request, reply }));

// DELETE requests
fastify.delete('/delete/properties', {}, async (request, reply) => deleteProperties({ request, reply }));
fastify.delete('/delete/reports', {}, async (request, reply) => deleteReports({ request, reply }));

// MISC requests
fastify.post('/graphql', {}, async (request, reply) => graphql({ request, reply }));
fastify.post('/help', {}, async (request, reply) => help({ request, reply }));

fastify.listen({ port: 3000 }, (err) => {
    console.log(`Server listening on ${fastify.server.address().port}`)
    if (err) throw err
})