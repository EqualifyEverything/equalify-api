import { graphqlQuery } from '../utils/index.js';

export const getResults = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    const response = await graphqlQuery({
        query: `{
            urls {
                nodes {
                    urlId: id
                    url
                }
            }
            messages {
                nodes {
                    id
                    message
                    type
                    relatedTagIds: tagIds
                    relatedNodeIds: enodeIds
                }
            }
            tags {
                nodes {
                    tagId: id
                    tag
                }
            }
            nodes: enodes {
                nodes {
                    nodeId: id
                    html
                    targets
                    relatedUrlId: urlId
                    equalified
                }
            }
        }`
    });
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
        urls: response.data.urls.nodes,
        nodes: response.data.nodes.nodes.map(obj => ({
            ...obj,
            targets: JSON.parse(obj.targets),
        })),
        messages: response.data.messages.nodes.map(obj => ({
            ...obj,
            relatedTagIds: JSON.parse(obj.relatedTagIds),
            relatedNodeIds: JSON.parse(obj.relatedNodeIds),
        })),
        tags: response.data.tags.nodes,
    };
}