import { jwtClaims } from "#src/app";
import {
  formatId,
  validateDiscovery,
  validateDiscoveryOptions,
  validateUrl,
  db,
  isStaging,
  validateUuid,
} from "#src/utils";
import { ScanResponse, ScanResponseJob } from "#src/utils/interfaces";

/*
input:
property: uuid
pages: [
  uuid,
  uuid,
  ...
]

*/

export const updatePropertyOnPages = async ({ request, reply }) => {
  // check input for errors
  if (!request.body.property) {
    return {
      status: "error",
      message: 'The "property" field is required.',
    };
  }

  for (const id of request.body.urls) {
    if (!validateUuid(id)) {
      return {
        status: "error",
        message: `${id} is not a valid ID.`,
      };
    }
  }

  let count = 0;
  for (const id of request.body.urls) {
    const change =
      request.body.property == "null" // if we get "null"<string> update to NULL in the db
        ? await db.query(
            `
      UPDATE "urls" SET "property_id"=NULL WHERE "id"=$1 AND "user_id"=$2
  `,
            [id, jwtClaims.sub]
          )
        : await db.query(
            `
          UPDATE "urls" SET "property_id"=$1 WHERE "id"=$2 AND "user_id"=$3
      `,
            [request.body.property, id, jwtClaims.sub]
          );
    if (change) count++;
  }
  await db.clean();

  return {
    status: "success",
    message: `Property set on ${count} pages.`,
  };
};
