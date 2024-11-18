import { jwtClaims } from "#src/app";
import {
  formatId,
  validateDiscovery,
  validateDiscoveryOptions,
  validateUrl,
  db,
  isStaging,
} from "#src/utils";

interface ScanResponseJob {
  jobId: string;
  url: string;
}

interface ScanResponse {
  jobs: Array<ScanResponseJob>;
  messages: Array<string>;
}

export const addPages = async ({ request, reply }) => {
  // check input for errors
  if (!request.body.mode) {
    return {
      status: "error",
      message: 'The "mode" field is required.',
    };
  }

  if (!request.body.urls && request.body.mode != "sitemap") {
    return {
      status: "error",
      message: "An array of URLs to add is required.",
    };
  } else {
    for (const url in request.body.urls) {
      if (!validateUrl(url)) {
        return {
          status: "error",
          message: `${url} is not a valid url.`,
        };
      }
    }
  }

  if (request.body.mode == "sitemap") {
    if (!request.body.sitemapUrl) {
      return {
        status: "error",
        message: `Sitemap mode reqiures the sitemapUrl field.`,
      };
    }
    if (!validateUrl(request.body.sitemapUrl)) {
      return {
        status: "error",
        message: `${request.body.sitemapUrl} is not a valid sitemapUrl.`,
      };
    }
  }

  const propertyToAddTo = request.body.property ? request.body.property : null;
  let jobIds: ScanResponse;

  
  if (request.body.mode == "sitemap") { // send sitemap to scan
    jobIds = await (
      await fetch(
        `https://scan${isStaging ? "-dev" : ""}.equalify.app/generate/url`, // single-url endpoint
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: request.body.sitemapUrl,
            userId: jwtClaims.sub,
          }),
        }
      )
    ).json();
  } else { // send pages to scan
    jobIds = await (
      await fetch(
        `https://scan${isStaging ? "-dev" : ""}.equalify.app/generate/urls`, // multi-url endpoint
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: request.body.urls,
            userId: jwtClaims.sub,
          }),
        }
      )
    ).json();
  }
  
  for (const { jobId, url } of jobIds?.jobs ?? []) {
    // Add normalized url to urls table  
    const urlId =
      (
        await db.query({
          text: `SELECT "id" FROM "urls" WHERE "user_id"=$1 AND "url"=$2`,
          values: [jwtClaims.sub, url],
        })
      ).rows?.[0]?.id ??
      (
        await db.query({
          text: `INSERT INTO "urls" ("user_id", "url", "property_id") VALUES ($1, $2, $3) RETURNING "id"`,
          values: [jwtClaims.sub, url, propertyToAddTo],
        })
      ).rows?.[0]?.id;

    // add job id and normalized url to scans table
    const scan = (
      await db.query({
        text: `INSERT INTO "scans" ("user_id", "property_id", "url_id", "job_id") VALUES ($1, $2, $3, $4) RETURNING "job_id"`,
        values: [jwtClaims.sub, propertyToAddTo, urlId, parseInt(jobId)],
      })
    ).rows[0];
  };

  return {
    status: "success",
    message: `${jobIds.jobs.length} pages added successfully.`,
  };
};
