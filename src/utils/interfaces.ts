export interface ScanResponseJob {
  jobId: string;
  url: string;
}

export interface UrlForScan {
  url: string;
  urlId: string;
} 

export interface ScanResponse {
  jobs: Array<ScanResponseJob>;
  messages: Array<string>;
}
