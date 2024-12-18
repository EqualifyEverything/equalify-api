import { jwtClaims } from "#src/app";
import { db, graphql, isStaging, validateUrl, validateUuid } from "#src/utils";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient();

export const addScansByProperty = async ({ request, reply }) => {
  if (!request.query.propertyId) {
    return {
      status: "error",
      message: "PropertyId is required.",
    };
  }

  if (!validateUuid(request.query.propertyId))
    return {
      status: "error",
      message: `${request.query.propertyId} is not a valid of UUID.`,
    };

  //await db.connect();

  const urls = await graphql({
    request,
    query: `
    query{
        urls( where: { property_id: { _eq: $property_id } } ) {
            urlId: id
            url
        }
    }`,
    variables: {
      property_id: request.query.propertyId,
    },
  });

  //await db.clean();

  return {
    status: "success",
    message: urls?.data,
  };
};
