import Fastify from 'fastify';
import { addProperties, addReports, addResults, addScans, adminClearCache, adminProcessScans, deleteProperties, deleteReports, deleteUser, getApikey, getCharts, getFilters, getProperties, getReports, getResultsAll, getResultsCsv, getResultsMessages, getResultsSchema, getResultsTags, getResultsUrls, getScans, getUpdates, help, trackUser, updateProperties, updateReports } from '#src/routes';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { db } from './utils';
import { getScan } from './routes/getScan';
export const fastify = Fastify();
const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.WEB_CLIENT_ID,
    tokenUse: 'id',
});
export const jwtClaims = { sub: null };

fastify.addHook('preHandler', async (request, reply) => {
    try {
        const apikey = request.headers.apikey ?? request.query.apikey;
        if (apikey) {
            await db.connect();
            const userId = (await db.query(`SELECT "id" FROM "users" WHERE "apikey"=$1`, [apikey])).rows[0].id;
            await db.clean();
            request.headers['x-hasura-user-id'] = userId;
            request.headers['x-hasura-role'] = 'user';
            jwtClaims.sub = userId;
        }
        else {
            jwtClaims.sub = (await cognitoJwtVerifier.verify(request.headers.authorization?.replace('Bearer ', '')))?.sub;
            if (['11fb4560-a051-70af-b453-224ea94a8e62'].includes(jwtClaims.sub)) {
                jwtClaims.sub = 'd1cb9560-7001-7014-a28f-cd6da935b063';
            }
        }
    }
    catch (err) {
        console.log(err);
        reply.code(401).send({ message: `Error: You must include an "authorization" header with a valid JWT token or an "apikey" header with a valid API key.` });
    }
})

// GET requests
fastify.get('/get/results', {}, async (request, reply) => getResultsAll({ request, reply }));
fastify.get('/get/results/schema', {}, async (request, reply) => getResultsSchema({ request, reply }));
fastify.get('/get/results/all', {}, async (request, reply) => getResultsAll({ request, reply }));
fastify.get('/get/results/csv', {}, async (request, reply) => getResultsCsv({ request, reply }));
fastify.get('/get/results/messages', {}, async (request, reply) => getResultsMessages({ request, reply }));
fastify.get('/get/results/tags', {}, async (request, reply) => getResultsTags({ request, reply }));
fastify.get('/get/results/urls', {}, async (request, reply) => getResultsUrls({ request, reply }));
fastify.get('/get/properties', {}, async (request, reply) => getProperties({ request, reply }));
fastify.get('/get/updates', {}, async (request, reply) => getUpdates({ request, reply }));
fastify.get('/get/scans', {}, async (request, reply) => getScans({ request, reply }));
fastify.get('/get/scan', {}, async (request, reply) => getScan({ request, reply }));
fastify.get('/get/reports', {}, async (request, reply) => getReports({ request, reply }));
fastify.get('/get/filters', {}, async (request, reply) => getFilters({ request, reply }));
fastify.get('/get/charts', {}, async (request, reply) => getCharts({ request, reply }));
fastify.get('/get/apikey', {}, async (request, reply) => getApikey({ request, reply }));

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
fastify.delete('/delete/user', {}, async (request, reply) => deleteUser({ request, reply }));

// MISC requests
fastify.post('/help', {}, async (request, reply) => help({ request, reply }));
fastify.post('/track/user', {}, async (request, reply) => trackUser({ request, reply }));
fastify.get('/admin/clear-cache', {}, async (request, reply) => adminClearCache({ request, reply }));
fastify.get('/admin/process-scans', {}, async (request, reply) => adminProcessScans({ request, reply }));

fastify.listen({ port: 3000 }, (err) => {
    console.log(`Server listening on ${fastify.server.address().port}`)
    if (err) throw err
})