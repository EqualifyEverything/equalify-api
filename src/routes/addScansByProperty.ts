import { jwtClaims } from "#src/app";
import { db, graphql, isStaging, validateUrl, validateUuid } from "#src/utils";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient();

export const addScansByProperty = async ({ request, reply }) => {
  if (!request.body.propertyId) {
    return {
      status: "error",
      message: "PropertyId is required.",
    };
  }

  if (!validateUuid(request.body.propertyId))
    return {
      status: "error",
      message: `${request.body.propertyId} is not a valid of UUID.`,
    };

  //await db.connect();

  const urls = (await graphql({
    request,
    query: `
    query{
        urls( where: { property_id: { _eq: $propertyid } } ) {
            urlId: id
            url
        }
    }`,
    variables: {
      propertyid: request.body.propertyId,
    },
  })).stringify();

  //await db.clean();

  return {
    status: "success",
    message: urls?.data,
  };
};
