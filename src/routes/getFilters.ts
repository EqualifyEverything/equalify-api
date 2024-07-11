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
        result: {
            messages: response.messages.map(obj => ({ ...obj, type: 'messages' })),
            tags: response.tags.map(obj => ({ ...obj, type: 'tags' })),
            properties: response.properties.map(obj => ({ ...obj, type: 'properties' })),
            urls: response.urls.map(obj => ({ ...obj, type: 'urls' })),
            statuses: [
                { label: 'Active', value: 'active', type: 'status' },
                { label: 'Equalified', value: 'equalified', type: 'status' },
            ],
        },
    };
}