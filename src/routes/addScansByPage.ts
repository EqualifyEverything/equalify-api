import { ScanResponse, ScanResponseJob, UrlForScan } from "#src/utils/interfaces";
import {
  formatId,
  validateDiscovery,
  validateDiscoveryOptions,
  validateUrl,
  db,
  isStaging,
} from "#src/utils";
import { jwtClaims } from "#src/app";

/*
Send pages to scan

input:
urls: 
    [
        { 
            urlId: string
            url: string
        }
    ]
*/

export const addScansByPage = async ({ request, reply }) => {

  const data = JSON.parse(request.body);
  

  // check request
  if (!data?.urls) {
    return {
      status: "error",
      message: "An array of URLs to send is required."
    };
  } else {
    for (const urlObj of data.urls as Array<UrlForScan>) {
      if (!validateUrl(urlObj.url)) {
        return {
          status: "error",
          message: `${urlObj.url} is not a valid url.`,
        };
      }
    }
  }

  // send pages to scan
  const jobIds = await (
    await fetch(
      `https://scan${isStaging ? "-dev" : ""}.equalify.app/generate/urls`, // multi-url endpoint
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: data.urls,
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
    scansAdded:{
        jobIds: addedJobsIds
    }
  }
};
