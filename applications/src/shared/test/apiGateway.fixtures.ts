/* istanbul ignore file */

import { type APIGatewayProxyEvent, type APIGatewayProxyEventHeaders, type Context } from "aws-lambda";

function headers(): APIGatewayProxyEventHeaders {
  return {
    Authorization: "Basic X",
    "Content-Type": "application/json",
  };
}

export function getSampleContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: "myFunction",
    functionVersion: "1",
    invokedFunctionArn: "string",
    memoryLimitInMB: "string",
    awsRequestId: "string",
    logGroupName: "string",
    logStreamName: "string",
    getRemainingTimeInMillis: () => 0,
    done: () => null,
    fail: () => null,
    succeed: () => null,
  };
}

export function getSampleEvent(params?: {
  pathParameters?: any;
  body?: any;
}): APIGatewayProxyEvent {
  return {
    resource: "/my/path",
    path: "/my/path",
    httpMethod: "GET",
    headers: headers(),
    multiValueHeaders: {
      header1: ["value1"],
      header2: ["value1", "value2"],
    },
    queryStringParameters: {
      parameter2: "value",
    },
    multiValueQueryStringParameters: {
      parameter1: ["value1", "value2"],
      parameter2: ["value"],
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "id",
      authorizer: {
        claims: null,
        scopes: null,
      },
      domainName: "id.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "id",
      extendedRequestId: "request-id",
      httpMethod: "GET",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "IP",
        user: null,
        userAgent: "user-agent",
        userArn: null,
        clientCert: {
          clientCertPem: "CERT_CONTENT",
          subjectDN: "www.example.com",
          issuerDN: "Example issuer",
          serialNumber: "a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1",
          validity: {
            notBefore: "May 28 12:30:02 2019 GMT",
            notAfter: "Aug  5 09:36:04 2021 GMT",
          },
        },
      },
      path: "/my/path",
      protocol: "HTTP/1.1",
      requestId: "id=",
      requestTime: "04/Mar/2020:19:15:17 +0000",
      requestTimeEpoch: 1583349317135,
      resourceId: "resourceId",
      resourcePath: "/my/path",
      stage: "$default",
    },
    pathParameters: params?.pathParameters ?? null,
    stageVariables: null,
    body: params?.body ?? null,
    isBase64Encoded: false,
  };
}
