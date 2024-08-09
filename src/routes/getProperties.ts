import { graphql } from '#src/utils';

export const getProperties = async ({ request, reply }) => {
    const response = await graphql({
        request,
        query: `query($limit: Int, $offset: Int){
            properties: properties_aggregate(limit: $limit, offset: $offset, order_by: {updated_at: desc}, 
                ${(request.query.propertyIds || request.query.propertyDiscovery || request.query.propertyUrls) ? `
                    where: {
                        ${request.query.propertyIds ? `id: {_in: [
                            ${request.query.propertyIds.split(',').map(obj => `"${obj}"`).join()}
                        ]},` : ''}
                        ${request.query.propertyDiscovery ? `discovery: {_eq: "${request.query.propertyDiscovery}"},` : ''}
                        ${request.query.propertyUrls ? `property_url: {_in: ${request.query.propertyUrls.split(',').map(obj => `"${obj}"`)}},` : ''}
                    }` : ''}
            ) { 
                nodes {
                    id
                    name
                    propertyUrl: property_url
                    lastProcessed: last_processed
                    archived
                    discovery
                    processed
                    updatedAt: updated_at
                    createdAt: created_at
                }
                totalCount: aggregate {count}
            }
        }`,
        variables: {
            limit: parseInt(request.query.limit ?? 100),
            offset: parseInt(request.query.offset ?? 0),
        },
    });

    return {
        status: 'success',
        result: response?.properties?.nodes?.map(obj => ({
            ...obj,
        })),
        total: response?.properties?.totalCount?.count,
    };
}