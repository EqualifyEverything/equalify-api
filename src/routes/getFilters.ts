import { graphqlQuery } from '#src/utils';

export const getFilters = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `{
            messages {
                value: id
                label: message
            }
            tags {
                value: id
                label: tag
            }
            properties {
                value: id
                label: name
            }
            urls {
                value: id
                label: url
            }
        }`
    }))?.data;

    return {
        status: 'success',
        result: { ...response, statuses: { label: 'Active', value: 'Active' } },
    };
}