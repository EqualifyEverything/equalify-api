import { pgClient } from "../utils/index.js";

export const postConfirmationConfirmSignUp = async (event) => {
    const { sub, email, given_name, family_name } = event.request.userAttributes;
    await pgClient.connect();
    await pgClient.query(`
        INSERT INTO "users" ("id", "email", "first_name", "last_name") VALUES ($1, $2, $3, $4)
    `, [sub, email, given_name, family_name]);
    await pgClient.clean();
    return event;
}