import Fastify from 'fastify';
import fastifyPg from '@fastify/postgres';
import { getResults } from './routes/index.js';
export const fastify = Fastify();

fastify.register(fastifyPg, { connectionString: process.env.DB_CONNECTION_URL });

fastify.get('/get/results', {}, async (request, reply) => getResults({ request, reply, fastify }));

fastify.listen({ port: 3000 }, (err) => {
    console.log(`Server listening on ${fastify.server.address().port}`)
    if (err) throw err
})