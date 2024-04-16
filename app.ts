import Fastify from 'fastify';
import fastifyPg from '@fastify/postgres';
export const fastify = Fastify();

fastify.register(fastifyPg, { connectionString: process.env.DB_CONNECTION_URL });

fastify.get('/', async (request, reply) => {
    const client = await fastify.pg.connect()
    const { rows } = await client.query(`SELECT * FROM "users"`);
    console.log(rows);
    await client.release();
    console.log(request, reply);
    return { message: 'Equalify everything!' };
});

fastify.listen({ port: 3000 }, (err) => {
    console.log(`Server listening on ${fastify.server.address().port}`)
    if (err) throw err
})