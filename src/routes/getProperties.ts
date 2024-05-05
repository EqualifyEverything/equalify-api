import { graphqlQuery } from '../utils/index.js';

export const getProperties = async ({ request, reply }) => {
    const response = (await graphqlQuery({
        query: `query($first: Int, $offset: Int){
            properties(first: $first, offset: $offset, 
                ${(request.query.propertyIds || request.query.propertyDiscovery || request.query.propertyUrls) ? `
                    filter: {
                        ${request.query.propertyIds ? `id: {in: [
                            ${request.query.propertyIds.split(',').map(obj => `"${obj}"`).join()}
                        ]},` : ''}
                        ${request.query.propertyDiscovery ? `propertyDiscovery: {eq: "${request.query.propertyDiscovery}"},` : ''}
                        ${request.query.propertyUrls ? `sitemapUrl: {in: ${request.query.propertyUrls.split(',').map(obj => `"${obj}"`)}},` : ''}
                    }` : ''}
            ) { 
                nodes {
                    id
                    name
                    sitemapUrl
                    lastProcessed
                    archived
                    discovery
                    processed
                }
                totalCount
            }
        }`,
        variables: {
            first: parseInt(request.query.first ?? 100),
            offset: parseInt(request.query.offset ?? 0),
        },
    }))?.data;

    return {
        status: 'success',
        result: response?.properties?.nodes?.map(obj => ({
            ...obj,
        })),
        total: response?.properties?.totalCount,
    };
}