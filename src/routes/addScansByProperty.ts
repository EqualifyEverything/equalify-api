import { jwtClaims } from "#src/app";
import { db, graphql, isStaging, validateUrl, validateUuid } from "#src/utils";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient();

export const addScansByProperty = async ({ request, reply }) => {
  if (!request.body.propertyIds) {
    return {
      status: "error",
      message: "PropertyIds are required.",
    };
  }

  for(const propertyId of request.body.propertyIds){
    if(!validateUuid(propertyId)) return {
        status: "error",
        message: `${propertyId} is not a valid of UUID.`
      }; 
  }

  await db.connect();

  let urlsToScan = [];
  for(const propertyId of request.body.propertyIds){
    const urls = await graphql({
        request,
        query: `{
            urls(where: {property_id: {_eq: $propertyId}}) {
                urlId: id
                url
            }
        }`,
        variables: {
          propertyId: propertyId,
        },
    });
    urlsToScan.push(...urls);
  }
  
  await db.clean();

  return {
    status: "success",
    message: urlsToScan,
  };
};
