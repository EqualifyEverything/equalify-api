import { graphqlQuery } from '../utils/index.js';

export const getResults = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    const response = await graphqlQuery({ query: `{allUsers {nodes {name}}}` });
    /*
    // Return should follow the Equalify Schema:
    {
        urls: [
            {
                urlId: 'uuid',
                url: 'string',
            },
        ],
        messages: [
            {
                message: 'string', 
                relatedTagIds: ['uuid'],
                relatedNodeIds: ['uuid'],
                type: 'enum (pass/error/violation)',
            },
        ],
        tags: [
            {
                tagId: 'uuid',
                tag: 'string',
            },
        ],
        nodes: [
            {
                nodeId: 'uuid',
                html: 'string',
                targets: ['string'], // OPTIONAL
                relatedUrlId: 'uuid',
                equalified: 'boolean',
            }
        ]
    }
    */
    return {
        response
    };
}