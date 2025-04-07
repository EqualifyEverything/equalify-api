import ServerlessClient from 'serverless-postgres';

export const db = new ServerlessClient({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
});

export const dbRestore = new ServerlessClient({
    user: process.env.DB_USER,
    host: process.env.DB_HOST_RESTORE,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
});