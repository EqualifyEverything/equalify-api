import { jwtClaims } from "#src/app";
import { db, graphql, isStaging, validateUrl, validateUuid } from "#src/utils";

/*
Send property to scan

input:
    propertyId: UUID 
*/

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

  const urls = await (await graphql({
    request,
    query: `
    query($property_id: uuid!){
        urls( where: { property_id: { _eq: $property_id } } ) {
            urlId: id
            url
        }
    }`,
    variables: {
        property_id: request.body.propertyId,
    },
  })).urls;

  // Below copied from addScansByPage, this should be consolidated/abstracted at some point
  // send pages to scan
  const jobIds = await (
    await fetch(
      `https://scan${isStaging ? "-dev" : ""}.equalify.app/generate/urls`, // multi-url endpoint
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: urls,
          userId: jwtClaims.sub,
        }),
      }
    )
  ).json();

  // save response in scan table
  let addedJobsIds = [];
  for (const { jobId, url } of jobIds?.jobs) {
    const urlId =
      (
        await db.query({
          text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2`,
          values: [jwtClaims.sub, url],
        })
      ).rows?.[0]?.id
    const scanJobId = (
      await db.query({
        text: `INSERT INTO "scans" ("user_id", "url_id", "job_id", "processing") VALUES ($1, $2, $3, $4) RETURNING "job_id"`,
        values: [jwtClaims.sub, urlId, parseInt(jobId), "TRUE"],
      })
    ).rows[0];
    addedJobsIds.push(scanJobId);
  }
  return {
    status:"success",
    scansAdded:{
        jobIds: addedJobsIds
    }
  }

};
