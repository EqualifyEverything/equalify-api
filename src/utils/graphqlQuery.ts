import { graphql as gql } from 'graphql';
import { withPostGraphileContext, createPostGraphileSchema } from 'postgraphile';
import pg from 'pg';
const pgPool = new pg.Pool({ connectionString: process.env.DB_CONNECTION_URL });
const cache = createPostGraphileSchema(pgPool, 'public');

export const graphqlQuery = async ({ query, variables }) => {
    try {
        return await withPostGraphileContext({ pgPool },
            async context => (await gql({ schema: (await cache), source: query, contextValue: context, variableValues: variables }))
        );
    } catch (err) {
        console.log(err);
        return err;
    }
}