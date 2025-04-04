import { db, graphql } from '#src/utils';
import { gzipSync } from 'zlib';

export const getResultsCsv = async ({ request, reply }) => {
    await db.connect();
    const report = (await db.query(`SELECT "id", "name", "filters", "cache_date" FROM "reports" WHERE "id" = $1`, [request.query.reportId])).rows[0];
    const types = ['properties', 'urls', 'messages', 'nodes', 'tags', 'types', 'status'];
    const filters = Object.fromEntries(types.map(obj => [obj, []]));
    for (const type of types) {
        filters[type] = report.filters.filter(obj => obj.type === type).map(obj => obj.value)
    }

    // Check if there are any urls in our request
    const urls = (await db.query({
        text: `SELECT "id", "url" FROM "urls" WHERE "id" = ANY($1::uuid[]) OR "property_id" = ANY($2::uuid[])`,
        values: [filters.urls, filters.properties],
    })).rows;

    const query = {
        request,
        query: `query (
            $urlIds: [uuid!],
            ${filters.types.length > 0 ? '$typeIds: [String],' : ''}
            ${filters.messages.length > 0 ? '$messageIds: [uuid],' : ''}
            ${filters.tags.length > 0 ? '$tagIds: [uuid],' : ''}
            ${filters.status.length > 0 ? '$equalified: Boolean,' : ''}
        ) {
            nodes: enodes(where: {
                url_id: {_in: $urlIds},
                ${filters.status.length > 0 ? `equalified: {_eq: $equalified},` : ''}
                ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `message_nodes: {message: {` : ``}
                    ${filters.types.length > 0 ? `type: {_in: $typeIds},` : ``}
                    ${filters.messages.length > 0 ? `id: {_in: $messageIds},` : ``}
                    ${filters.tags.length > 0 ? `message_tags:{tag:{id: {_in: $tagIds}}},` : ``}
                ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `}}` : ``}
            }) {
                nodeId: id
                createdAt: created_at
                html
                targets
                relatedUrlId: url_id
                equalified
                enodeUpdates: enode_updates { createdAt: created_at equalified }
                messageNodes: message_nodes(where:{
                    ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `message: {` : ``}
                        ${filters.types.length > 0 ? `type: {_in: $typeIds},` : ``}
                        ${filters.messages.length > 0 ? `id: {_in: $messageIds},` : ``}
                        ${filters.tags.length > 0 ? `message_tags:{tag:{id: {_in: $tagIds}}},` : ``}
                    ${filters.types.length > 0 || filters.messages.length > 0 || filters.tags.length > 0 ? `}` : ``}
                }) {
                    id
                    node: enode {
                        equalified
                    }
                    message {
                        id
                        message
                        type
                        ${urls.length < 100 ? `
                            messageTags: message_tags(where:{
                                ${filters.tags.length > 0 ? `tag:{id: {_in: $tagIds}},` : ``}
                            }) {
                                tag {
                                    id
                                    tag
                                }
                            }
                        ` : ''}
                    }
                }
            }
        }`,
        variables: {
            urlIds: urls.map(obj => obj.id),
            ...filters.types.length > 0 && ({ typeIds: filters.types }),
            ...filters.messages.length > 0 && ({ messageIds: filters.messages }),
            ...filters.tags.length > 0 && ({ tagIds: filters.tags }),
            ...filters.status.length > 0 && ({ equalified: filters.status[0] === 'active' ? false : true }),
        },
    };
    console.log(JSON.stringify({ query }));
    const response = await graphql(query);
    const filteredNodes = response.nodes ?? [];

    // Get URL lookup map for easier reference
    const urlMap = urls.reduce((acc, url) => {
        acc[url.id] = url.url;
        return acc;
    }, {});

    // Create CSV header
    const csvHeader = [
        'Node ID',
        'URL',
        'HTML',
        'Targets',
        'Status',
        'Created At',
        'Messages'
    ].join(',');

    // Create CSV rows
    const csvRows = filteredNodes.slice(0, 10000).map(node => {
        // Escape fields that might contain commas or quotes
        const escapeField = (field) => {
            if (field === null || field === undefined) return '';
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        const nodeMessages = node.messageNodes.map(mn => 
            `${escapeField(mn.message.type)}: ${escapeField(mn.message.message)}`
        ).join(' | ');

        return [
            escapeField(node.nodeId),
            escapeField(urlMap[node.relatedUrlId] || ''),
            escapeField(node.html),
            escapeField(Array.isArray(node.targets) ? node.targets.join(', ') : node.targets),
            escapeField(node.equalified ? 'Equalified' : 'Active'),
            escapeField(node.createdAt),
            escapeField(nodeMessages)
        ].join(',');
    });

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\r\n');

    // Compress the CSV content
    const compressedBody = gzipSync(csvContent);
    
    // Cache the compressed CSV
    await db.clean();
    
    // Set appropriate headers for CSV download
    reply.headers({ 
        'content-encoding': 'gzip',
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="${report.name.replace(/[^a-z0-9]/gi, '_')}_report.csv"`
    });
    
    return reply.send(compressedBody);
}