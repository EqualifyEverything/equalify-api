import { isStaging } from '.';

export const hasuraQuery = async ({ request, query, variables = {} }) => {
    const Authorization = request?.headers?.authorization;
    const response = (await (await fetch(`https://graphql.equalify.${isStaging ? 'dev' : 'app'}/v1/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...Authorization ? { Authorization } : { 'x-hasura-admin-secret': process.env.DB_PASSWORD },
        },
        body: JSON.stringify({ query, variables }),
    })).json());
    if (!response?.data) {
        console.log(JSON.stringify({ graphqlError: response }));
    }
    return response?.data;
}