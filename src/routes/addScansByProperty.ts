import { jwtClaims } from "#src/app";
import { db, graphql, isStaging, validateUrl } from "#src/utils";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient();

export const addScansByProperty = async ({ request, reply }) => {
  if (!request.body.propertyIds) {
    return {
      status: "error",
      message: "PropertyIds are required.",
    };
  }

  await db.connect();
  const urlsToScan = request.body.propertyIds.map(async (propertyId)=>{
    return await graphql({
        request,
        query: `
        urls(where: {property_id: {_eq: $propertyId}}) {
            urlId: id
            url
        }`,
        variables: {
          propertyId: propertyId,
        },
      });
  })
  
  await db.clean();

  return {
    status: "success",
    message: urlsToScan,
  };
};
