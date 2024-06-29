import { graphqlQuery, pgClient } from '#src/utils';

export const getResults = async ({ request, reply }) => {
    /*
    Ability to filter by propertyIds, urlIds, nodeIds, nodeUpdateIds, messageIds, and tagIds
    Messages, Tags, Properties, Pages are sorted by properties related to the most nodes w/ nodeEqualified set to false (most to least)
    */
    await pgClient.connect();
    const reports = (await pgClient.query(`SELECT "id", "name", "filters" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows;
    console.log(JSON.stringify(reports));
    await pgClient.clean();
    const response = await graphqlQuery({
        query: `{
            urls {urlId:id url}
            messages {id message type relatedTagIds:tagIds relatedNodeIds:enodeIds}
            tags {tagId:id tag}
            nodes:enodes {nodeId:id html targets relatedUrlId:urlId equalified}
        }`
    });
    return {
        reportNames: reports.map(obj => obj.name),
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