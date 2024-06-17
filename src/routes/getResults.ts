import { graphqlQuery } from '#src/utils';

export const getResults = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    const response = await graphqlQuery({
        query: `{
            urls {urlId:id url}
            messages {id message type relatedTagIds:tagIds relatedNodeIds:enodeIds}
            tags {tagId:id tag}
            nodes:enodes {nodeId:id html targets relatedUrlId:urlId equalified}
        }`
    });
    return {
        urls: response.data.urls,
        nodes: response.data.nodes.map(obj => ({
            ...obj,
            targets: JSON.parse(obj.targets),
        })),
        messages: response.data.messages.map(obj => ({
            ...obj,
            relatedTagIds: JSON.parse(obj.relatedTagIds),
            relatedNodeIds: JSON.parse(obj.relatedNodeIds),
        })),
        tags: response.data.tags,
    };
}