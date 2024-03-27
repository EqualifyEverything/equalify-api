# Equalify API
API to interact with the [Equalify Platform](https://github.com/EqualifyEverything/equalify).

## Authentication
You must have a valid authentication token to use the API.

## Get Scan Results
The `/get/scan_results` endpoint returns scan results.

Whenever you get content, the API will return a result and "success" or "fail" `status`. Failures look like this:
```
{
  "status": "fail",
  "result": "Filter property ids \"1,3, and 4\" are invalid"
}
```

Successes output results from that database  in JSON that conforms to the [Equalify Schema](https://github.com/EqualifyEverything/equalify-schema/blob/main/equalify-schema-app/equalify-schema.json).

### Filtering Scan Results
All content can be filtered via a mix of filters. You can filter by `propertyIds`, `urlIds`, `nodeIds`, `messageIds`, `tagIds`, `nodeUpdatePeriod`. 

Filters are passed via the JSON body in a POST request, like this:
```
{
    "propertyIds": [2,3],
    "urlIds": [4,1],
    "nodeIds": [5],
    "messageIds": [6],
    "tagIds": [7,8],
    "nodeUpdatePeriod": [
        "startDate": 2023-11-11,
        "endDate": 2024-11-11,
    ]
}
```
That example would only show results related to tag id 7 AND 8 AND message id 6 AND node id 5 AND URL id 4 AND 1 AND property id 2 AND 3 AND node updates from November 11, 2023 - November 11, 2024.

**Please Note:**
- `nodeUpdatePeriod` must an array with `startDate` and `endDate`. Dates must be formatted `yyyy-mm-dd`.

## Get Queued Scans
Use `/get/queued_scans` to get a list of all the queued scans.

The endpoint will return JSON like this:
```
{
  "scans": [
    "queuedScanJobID": 123,
    "queuedScanPropertyId": 4,
    "queuedScanUrlId": NULL,
    "queuedScanProcessing": NULL,
    "queuedScanPrioritized": NULL
  ]
} 
```

## Add Content
You can add content to the database using the `/add/[content_type]` endpoint. 

Whenever you add content, the API will return a message and "success" or "fail" `status`, like this:
```
{
  "status": "success",
  "result": "Example property successfully added!"
}
```

### Add Properties
Properties are added via `/add/properties`. That endpoint requires the valid body, like this:
```
{
    "properties": [
      {
        "propertyName": "Example Property",
        "propertyUrl": "https://example.com",
        "propertyDiscovery": "single_page_import"
      }
    ]
}
```

**Please Note:**
- `propertyDiscovery` valid strings include `sitemap_import` or `single_page_import`.

### Add Reports
Reports are added via `/add/reports`. That endpoint requires the following body:
```
{
    "reports": [
      {
        "reportTitle": "",
        "reportFilters": []
      }
    ]
}
```
**Please Note:**
`report_filters` must include valid filters. Here is a valid `report_filters` array:
```
{
    "propertyIds": [2,3],
    "urlIds": [4,1],
    "nodeIds": [5],
    "messageIds": [6],
    "tagIds": [7,8],
    "nodeUpdatePeriod": [
        "startDate": 2023-11-11,
        "endDate": 2024-11-11,
    ]
}
```

## Start Scans

A scan is started with the endpoint `/start_scan/[type]`. Valid types include [properties] or [URLs].

Whenever you start scans, the API will return a `result` and "success" or "fail" `status`. Example:
```
{
  "status": "success",
  "result": "Property scan initiated."
}
```

### Scan Property
To scan properties, you can use `/start_scan/properties`. In the body of the JSON, you will specify the property ids, like this:
```
{
    "propertyIds": [3,4]
}
```

### Scan URLs
To scan urls, you can use `/start_scan/url`. In the body of the JSON, you will specify the url ids, like this:
```
{
    "urlIds": [3,4]
}
```


## Additional Notes
- Equalify's database structure can be understood via [install.php](https://github.com/EqualifyEverything/equalify/blob/v1-rc5/actions/install.php)https://github.com/EqualifyEverything/equalify/blob/v1-rc5/actions/install.php
