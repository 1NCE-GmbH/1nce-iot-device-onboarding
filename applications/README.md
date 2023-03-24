# SIM Retrieval Service

## Description
The responsibility of this service is to retrieve all customer SIM cards through the management API, compare the results with the open source project database and create SQS events for the new and removed SIMs.

## Requirements
- `zip` command - used to compress code to upload to AWS Lambda
```
### Linux
apt-get install zip

### OS X 
brew install zip 
```

## Environment variables
| Name                                  | Description                                   | Example                                                   |
| ------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| MANAGEMENT_API_URL                    | 1nce management API URL                       | https://api-prod.1nce.com/management-api                  |
| MANAGEMENT_API_CREDENTIALS_SECRET_ARN | ID of secret with API credentials             | arn:aws:secretsmanager:REGION:ACCOUNT-ID:secret:ID        |
| SIMS_TABLE                            | Table used to store SIMs data                 | sim-metastore                                             |
| SIM_CREATE_QUEUE_URL                  | SQS queue URL to upload new SIMs data         | https://sqs.REGION.amazonaws.com/ACCOUNT/sims-create.fifo |
| SIM_DELETE_QUEUE_URL                  | SQS queue URL to upload deleted SIMs data     | https://sqs.REGION.amazonaws.com/ACCOUNT/sims-delete.fifo |

## How to run unit tests
```
npm test
```
If you want to check the coverage of the unit tests:
```
npm run test:coverage
```

## Process of adding new lambda:

1. create new folder for lambda in 
```
src/<lambda-name>/<lambda-name>.ts
```
2. Register new lambda in webpack.config.js file under entry block on line 5, so it gets compiled by webpack:

```
["<lambda-name>"]: "./src/<lambda-name>/<lambda-name>.ts",
```

3. Add new lambda to zip:all script in package.json zip:all script on line 13:

```
    "zip:all": "LAMBDA=sim-retrieval npm run zip:lambda && LAMBDA=<lambda-name> npm run zip:lambda"
```

## How to build the service
1) Build Typescript code
```
npm run build
```

2) Compress generated Javascript code
```
npm run zip
```

3) Inside the `dist` folder you will find the `sim-retrieval.zip` file ready to upload to AWS Lambda


