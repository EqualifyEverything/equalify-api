import { pgClient } from "../utils/index.js";

export const postConfirmationConfirmSignUp = async (event) => {
    const { sub, email, name } = event.request.userAttributes;
    await pgClient.connect();
    await pgClient.query(`
        INSERT INTO "users" ("id", "email", "name") VALUES ($1, $2, $3)
    `, [sub, email, name]);
    await pgClient.clean();
    return event;
}