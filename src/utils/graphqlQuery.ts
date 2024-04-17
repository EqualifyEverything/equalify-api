import { graphql as gql } from 'graphql';
import { withPostGraphileContext, createPostGraphileSchema } from 'postgraphile';
import pg from 'pg';
import { jwtClaims } from '../app.js';
const pool = new pg.Pool({ connectionString: process.env.DB_CONNECTION_URL });
const cache = createPostGraphileSchema(pool, 'public');

export const graphqlQuery = async ({ query, variables = null }) => {
    try {
        return await withPostGraphileContext({
            pgPool: pool,
            pgDefaultRole: 'app_user',
            pgSettings: {
                'jwt.claims.role': 'app_user',
                'jwt.claims.user_id': jwtClaims.sub,
            },
        },
            async context => (await gql({
                schema: (await cache),
                source: query,
                contextValue: context,
                variableValues: variables,
            }))
        );
    } catch (err) {
        console.log(err);
        return err;
    }
}