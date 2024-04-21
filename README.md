<img src="https://equalify.dev/equalify.svg" alt="Equalify Logo" width="300">

# Equalify API

Equalify aims to be the most useful accessibility platform. That means faster scanning, more accurate results, and a more intuitive user interface. We publish Equalify code here so that you can run the platform locally, building new features and fixing issues.

## Overview

The Equalify API is written in TypeScript and runs on Node.js. We leverage the [Fastify framework](https://github.com/fastify/fastify) for handling HTTP requests/responses.

Our API is stateless and is intended to run ephemerally on serverless environments (currently AWS Lambda). We achieve this by wrapping our code with the `@fastify/aws-lambda` wrapper. You can still develop locally, however, by starting the Fastify server.

## Important Links

Production environment: https://api.equalify.dev  
Staging environment: https://api-staging.equalify.dev  
Local environment: http://localhost:3000

Postman collection: https://documenter.getpostman.com/view/26880150/2sA3BoarvB

## Setup

1. Clone the repository!
2. Install dependencies with `yarn install`
3. Create `.env.staging` and/or `.env.production` files- ask any of us for access.
4. Start your local server with `yarn start:staging` or `yarn start:prod`
5. Start developing!

## Contribute

Submit bug reports, questions, and patches to the repo's [issues](https://github.com/EqualifyEverything/equalify-api/issues) tab.

If you would like to submit a pull request, please read [CONTRIBUTE.md](https://github.com/EqualifyEverything/equalify/blob/main/CONTRIBUTE.md) and [ACCESSIBILITY.md](https://github.com/EqualifyEverything/equalify/blob/main/ACCESSIBILITY.md) before you do.

This project's code is published under the [GNU Affero General Public License v3.0](https://github.com/bbertucc/equalify/blob/main/LICENSE) to inspire new collaborations.

**Together, we can equalify the internet.**
