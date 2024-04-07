import Fastify from "fastify";

export const app = Fastify();

app.get("/", async (request, reply) => {
    console.log(request, reply);
    return { message: "Equalify everything!" };
});