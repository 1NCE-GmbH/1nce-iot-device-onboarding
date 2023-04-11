The Open Source project has one clear but distinctive focus - Enabling AWS customers to automatically onboard their IoT Devices into the AWS IoT Core (device-onboarding-as-a-Service) following a self-managed approach. Customers with the "1NCE Connect" product can map their IoT devices via SIM cards to certificates for the AWS IoT Core. The certificates allow publishing, subscription, and connection to AWS IoT Core MQTT broker.

Certificates and other credentials for MQTT subscription can be retrieved from HTTP GET endpoint by using the SIM-as-an-Identity service. Service allows using a single endpoint for all devices. Individual certificates are returned to each device depending on the IP address, that is being used in the 1NCE network.

<br /><br /><br />
## Quick start

#### Prerequisites
At least one 1NCE SIM card and access to the 1NCE.com portal. Access to an AWS account and the possibility to rollout a CFN stack is required.

#### Step-by-step process

1. Log in to your AWS account
2. Choose a Region with IoT Core service support
3. Go to Cloudformation > Stacks
4. Select Create Stack "With new resources"
5. As Amazon S3 URL use "https://device-onboarding-prod-cloudformation-templates.s3.eu-central-1.amazonaws.com/latest/device-onboarding-main.yaml"
6. Fill in stack name and [parameters](#input-parameters)
7. When the stack is rolled out, go to Systems Manager > Parameter store and get value from "openvpn-onboarding-proxy-server". This value is the onboarding endpoint URL.
8. Call the onboarding endpoint URL with a HTTP GET request and receive your device onboarding credentials. The request should be sent via 1NCE mobile network.
9. Use the Credentials to connect to the AWS IoT Core MQTT broker.

### Input Parameters

##### ManagementApiUsername, ManagementApiPassword
[1NCE portal](https://portal.1nce.com/portal/customer/users?) API User credentials.

A user with an API role should be created. Credentials will be used to retrieve all customers' 1NCE SIM cards via [Get ALL SIMs](https://help.1nce.com/dev-hub/reference/getsimsusingget) Endpoint.

##### OpenvpnOnboardingUsername, OpenvpnOnboardingPassword
[1NCE OpenVPN credentials](https://portal.1nce.com/portal/customer/configuration/credentials) can be downloaded:
1NCE portal > Configuration > OpenVPN Configuration > Download credentials.txt

OpenvpnOnboardingUsername is the numerical value in the first line of the file. E.g. 12345<br />
OpenvpnOnboardingPassword is the token placed in the second line of the file.


##### LambdaCron
Crontab determines when CloudWatch Events runs the rule that triggers the [SIM Retrieval Lambda](#sim-retrieval-lambda)

[Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions)

##### APIGatewayStageName:
Stage name of API Gateway deployment.

Example: `https://fka8ojq6lh.execute-api.us-west-1.amazonaws.com/APIGatewayStageName/SimOnboardingPath`
##### SimOnboardingPath:
REST API Path for sim onboarding endpoint.

Example: `https://fka8ojq6lh.execute-api.us-west-1.amazonaws.com/APIGatewayStageName/SimOnboardingPath`
##### BreakoutRegion:
Breakout region configured in the 1NCE Portal > Configuration > Breakout settings

Default: eu-central-1
<br /><br /><br />
# Low-level docs

## Architecture diagram:
![Diagram](resources/architecture_diagram.png?raw=true "Diagram")

## Public S3 bucket content.

The Public S3 bucket folder structure is created as follows:
- latest/ <br />
  [device-onboarding-main.yaml](https://device-onboarding-prod-cloudformation-templates.s3.eu-central-1.amazonaws.com/latest/device-onboarding-main.yaml) - Device Onboarding Main Stack: Main stack that is responsible for creating all nested stack resources in the correct sequence. 
- VX.X.X/
  - *.yaml - Substack CFN files for all the required [resources](#resouces-per-cfn-templates).
  - lambda/
    - *.zip - zip code for [Lambda](#lambdas)
  - nginxConfig/
    - nginx.conf - Nginx configuration. The configuration is used in the EC2 instance, that is acting as a proxy. It proxies device onboarding requests to API GW.
  -  openVpnConfig/
     -  *.conf - OpenVPN configuration file for each breakout region. The configuration is used in the EC2 instance.

## Private S3 bucket content.
The private S3 bucket folder structure is created as follows:

- VX.X.X/
  - lambda/
    - create-sim.zip - [Create SIM Lambda](#create-sim-lambda) zip code.
    - device-onboarding.zip - [Onboarding Lambda](#onboarding-lambda) zip code.
    - sim-retrieval.zip - [SIM Retrieval Lambda](#sim-retrieval-lambda) zip code.
    - disable-sim.zip - [Disable SIM lambda](#disable-sim-lambda) zip code.

## SNS

Two SNS topics are created where customers can subscribe to receive notifications on successful events or failures.

###  Failure Topic

On this topic notifications will be sent on such failures:
- [SIM Retrieval Lambda](#sim-retrieval-lambda) fails to retrieve SIM from 1NCE API.
- [SIM Retrieval Lambda](#sim-retrieval-lambda) fails to publish SIM changes to [SIMs create SQS](#sims-createfifo) or [SIMs disable SQS](#sims-disablefifo).
- [Create SIM Lambda](#create-sim-lambda) fails in case if an error occurs during IoT Core resources (thing, cert) creation or SIM creation in DB.
- [Disable SIM lambda](#disable-sim-lambda) sends failures if an error occurs during SIM disable.

Example message:
```
{
  "timestamp":1680526955876,
  "message": "Incorrect username or password"
}
```
### Success Topic

On this topic notifications will be sent on such events:
- [Create SIM Lambda](#create-sim-lambda) sends details about successfully created SIMs.
- [Disable SIM lambda](#disable-sim-lambda) sends details about successfully disabled SIMs.

Example messages:
```
{
  "iccid": "8988280666001099538",
  "ip": "10.242.0.3",
  "timestamp": 1680618078888,
  "message": "SIM enabled"
}

{
  "iccid": "8988280666001099538",
  "ip": "10.242.0.3",
  "timestamp": 1680618079888,
  "message": "SIM disabled"
}
```

## SQS

Two SQS queues are created where [SIM Retrieval Lambda](#sim-retrieval-lambda) is posting messages.

### sims-create.fifo
In this SQS messages are posted for SIMs that need to be created. Messages are processed by [Create SIM Lambda](#create-sim-lambda).

### sims-disable.fifo
In this SQS messages are posted for SIMs that need to be disabled. Messages are processed by [Disable SIM lambda](#disable-sim-lambda).

## SSM

 SSM parameters are used to exchange the values with [EC2 Instance](#ec2). SSM parameters names are configurable. Those contains:
- Parameter where API Gateway Endpoint URL is stored. Used by [EC2 Instance](#ec2) Nginx server.
- Parameter where API Gateway Endpoint Path is stored. Used by [EC2 Instance](#ec2) Nginx server configuration.
- Parameter filled by [EC2 Instance](#ec2). It contains the Proxy Server endpoint for the device onboarding. This is the actual onboarding endpoint where customers' devices should request the onboarding details.
- Breakout Region in 1NCE Portal. Used by [EC2 Instance](#ec2) for correct configuration download.

## Secrets Manager

Secrets manager secrets where values for [EC2 Instance](#ec2) are being stored. Secrets names are configurable. Those contain:
- Secret where 1NCE Management API credentials are being stored.
- Secret where 1NCE OpenVPN credentials are being stored.
## Lambdas

### SIM Retrieval Lambda

Lambda step-by-step flow:

1. Generate 1NCE API token by using credentials stored in the secrets manager
2. Use 1NCE API token to call [Get ALL SIMs](https://help.1nce.com/dev-hub/reference/getsimsusingget) Endpoint.
3. Get All SIMs from Dynamo DB.
4. Compare the lists:
   1. If a SIM that doesn't exist in DB is returned by 1NCE API, then SIM details are being sent to [SIMs create SQS](#sims-createfifo).
   2. If SIM that exists in DB is not returned by 1NCE API, then SIM details are being sent to [SIMs disable SQS](#sims-disablefifo)
5. If any error occurs - failure details are sent to [SNS Failure Topic](#failure-topic)


### Create SIM lambda

Lambda step-by-step flow:

1. Read the message from [SIMs create SQS](#sims-createfifo).
2. Create a new IoT Core Certificate.
3. Attach IoT Core Policy to the certificate.
4. Create a new IoT Core Thing. SIM cards iccid is being used as Thing name.
5. Attach the Certificate to the Thing.
6. Put SIM details in Dynamo DB.
7. Send a Success message to [SNS Success Topic](#success-topic)
8. Send a message to MQTT topic `registration`
9. If any error occurs - failure details are sent to [SNS Failure Topic](#failure-topic)

The message format for SNS and MQTT:
```
{
  "iccid": "8988280666001099538",
  "ip": "10.242.0.3",
  "timestamp": 1680618078888,
  "message": "SIM enabled"
}
```
### Disable SIM lambda

Lambda step-by-step flow:

1. Read the message from [SIMs disable SQS](#sims-disablefifo).
2. Change the Dynamo DB item. Mark the certificate as inactive `a: false`
3. Send a Success message to [SNS Success Topic](#success-topic)
4. If any error occurs - failure details are sent to [SNS Failure Topic](#failure-topic)

The message format for SNS:
```
{
  "iccid": "8988280666001099538",
  "ip": "10.242.0.3",
  "timestamp": 1680618078888,
  "message": "SIM disabled"
}
```

### Onboarding lambda

Lambda step-by-step success flow:

1. Get the IP address from the request. The IP address is added in request headers by the Nginx server running on the EC2 instance.
2. Find onboarding details (certs, private keys, IoT Core Endpoint URL) for the IP address in Dynamo DB.
3. Validate if the SIM is still active `a: true`
4. Form and return the response:
   1. If header {"content-type": "text/csv"} in the request is present - return the response in CSV format.
   2. If no such header exists return the response in JSON format.
1. If details are not found for the IP in DB, or SIM is not active - return the 404 status code.
2. If an unexpected error occurred - return the 500 status code.

JSON response example:
```
{
  "amazonRootCaUrl": "https://www.amazontrust.com/repository/AmazonRootCA1.pem",
  "certificate": "-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----\n",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n-----END RSA PRIVATE KEY-----\n",
  "iccid": "8988280666001099538",
  "iotCoreEndpointUrl": "xxxxxxxxxxxxxx.iot.us-west-1.amazonaws.com"
}
```

## EC2

[AutoScalingAndLaunchTemplateStack](#autoscalingandlaunchtemplatestack) defines the autoscaling group and launch template for EC2 Instance.

Full EC2 User Data can be found in `scripts/ec2-user-data.bash`

EC2 instance flow:

- Install AWS cli and all required utils.
- Get configured breakout region from SSM parameter. Download the OpenVPN config for the configured breakout region. Config is being downloaded from the public S3 bucket.
- Get OpenVPN credentials from Secrets Manager.
- Start OpenVPN service. Wait till the OpenVPN connection is established and the IP address is assigned.
- Use OpenVPN IP address, to generate onboarding endpoint proxy server endpoint. Put this value in the SSM parameter.
- Get onboarding endpoint from SSM parameter. Get onboarding endpoint x-api-key from api gateway.
- Download the Nginx config template from the public S3 bucket. Fill Nginx config. Run the Nginx server.
- Reboot EC2 instance.


### Connect to EC2 machine.

1. AWS > EC2 > Instances
2. Find EC2 instance with openvpn-onboarding-security-group SG
3. Connect > Session Manager


### Troubleshoot EC2 instance

#### Open VPN
`ifconfig` should show the tun0 interface. If the interface is not there - check the OpenVPN folder:
<br />
`ls /etc/openvpn/` 
<br />
`client  credentials.txt  openvpn-1nce-client.conf  server  update-resolv-conf`

credentials.txt should contain the same content as 1NCE portal > Configuration > OpenVPN Configuration > Download credentials.txt

More details https://help.1nce.com/dev-hub/docs/network-services-vpn-service

#### Nginx server
Nginx config:
`cat /etc/nginx/sites-available/default`

"proxy_pass" should contain the onboarding endpoint from the SSM parameter.<br />
"proxy_set_header" should set x-api-key for onboarding endpoint.
"proxy_set_header" should set onboarding-ip header.<br />

Nginx logs:
`tail /var/log/nginx/access.log` 


## IoT Core

Following resources are created for onboarding:

1. IoT Core Policy. The policy is attached to all certificates. The policy is being generated with [IOTCorePolicyStack.IotPolicyGenerator](#iotcorepolicystack).
2. IoT Core Certificates. The certificate is being attached to IoT Thing by [Create SIM lambda](#create-sim-lambda).
3. IoT Core Thing. Thing's name matches SIM iccid. The thing is being created by [Create SIM lambda](#create-sim-lambda).


## Resouces per CFN templates

##### IOTCorePolicyStack:
File Name: iot-core-policy.yaml

Lambda and other resources for IoT Core Policy Generation. Lambda is being used here because on stack deletion the Policy shouldn't be deleted, because it could be assigned to some resources. IoT Core Policy allows to subscribe, connect, and publish to MQTT broker topics. The policy is being attached to Certificates generated for each IoT Core Thing.
##### SQSResourcesStack:
File Name: sqs.yaml

[SQS](#sqs) queues.
##### SimTableStack:
File Name: sim-table.yaml

Dynamo table that stores customer SIMs details, together with certificates and private keys. Used by [SIM Retrieval Lambda](#sim-retrieval-lambda) to compare SIMs from DB with the SIMs returned by 1NCE API. Also Used by [Onboarding Lambda](#onboarding-lambda) to return the onboarding details for the device.

##### LambdaSimRetrievalStack:
File Name: sim-retrieval.yaml

[SIM Retrieval Lambda](#sim-retrieval-lambda) and required resources - IAM Role, Permissions and Crontab schedule.
##### LambdaCreateSimStack:
File Name: create-sim.yaml

[Create SIM Lambda](#create-sim-lambda) and required resources - IAM Role, Event Source Mapping
##### LambdaDisableSimStack:
File Name: disable-sim.yaml

[Disable SIM lambda](#disable-sim-lambda) and required resources - IAM Role, Event Source Mapping
##### IotCoreEndpointProviderStack:
File Name: iot-core-endpoint-provider.yaml

Lambda and other resources that reads and provides IOT Core Endpoint URL as output. IAM Role allows to describe IoT Core endpoint.
##### LambdaDeviceOnboardingStack:
File Name: device-onboarding.yaml

[Onboarding Lambda](#onboarding-lambda) and required IAM Role.
##### ApiGatewayStack:
File Name: api-gateway.yaml

API Gateway endpoint and all required resources for the [Onboarding Lambda](#onboarding-lambda). 
##### SSMResourcesStack:
File Name: ssm.yaml

[SSM parameters](#ssm).
##### SNSResourcesStack:
File Name: sns.yaml

[SNS Topics](#sns) and SNS policy.
##### NetworkResourcesStack:
File Name: network.yaml

VPC and all the network resources for onboarding.
##### AutoScalingAndLaunchTemplateStack:
FileName: autoscaling.yaml

Auto Scaling group and Launch Template resources for [EC2 Instance](#ec2). EC2 instances launch template uses the latest Ubuntu canonical AMI ID. As user data [scripts/ec2-user-data.bash](scripts/ec2-user-data.bash) is being used.<br />
IAM role Allows EC2 instances to get and put SSM parameters, get secrets manager values, and get API Gateway keys. It also allows connecting EC2 instances via AWS Session Manager.<br />
Auto Scaling group defines that there should always be 1 EC2 instance available as an onboarding proxy server.
##### S3BucketAndLocalFilesStack:
FileName: s3-lambda-code.yaml

[Private S3 bucket](#private-s3-bucket-content) used to store code for lambdas. Stack also contains Lambda resources that downloads files from the Public S3 bucket to the Private S3 bucket. Downloaded files contain code for [lambdas](#lambdas). This is needed because lambdas can take code only from S3 buckets that are placed in the same region.<br />
IAM Role allows to download files from the Public S3 bucket and Put them in the Private S3 bucket.
##### SecretsManagerStack:
FileName: secrets-manager.yaml

[Secrets Manager](#secrets-manager) secrets.
##### LambdaInvokeStack:
FileName: lambda-invoke.yaml

Custom Lambda and resources to invoke [SIM Retrieval Lambda](#sim-retrieval-lambda). This is done during Stack rollout to get all SIMs from [Get ALL SIMs](https://help.1nce.com/dev-hub/reference/getsimsusingget) Endpoint immediately.
## Building the project

In order to be able to deploy the templates to your S3 Bucket and then use it in the Cloud Formation, it is necessary to build the files beforehand.<br>For that purpose, there is a script developed for Linux systems that will do the job. The script has the following requirements:
- Admin rights, to be able to install dependencies
- Node 14 or newer
- Deployment values file properly filled (deploymentValues.yaml)

The `build.sh` script is located under the `scripts` folder and it can receive two arguments. The first refers to the environment in which the files will be deployed. The second argument is used to pass a version different from the one described in the `deploymentValues.yaml`. That is useful when deploying temporary testable versions.

### Deployment Values

Deployment values is a file located in the root of the repository and has the responsibility to keep shared values used across the templates. Most of them don't need to be touched and are there only because that is a common place for being reused. But, the values of `codeBaseBucket`, `codeBaseBucketRegion`, and `version` needs to be updated before running the script. Those values, except for the `version`, are described under the name of an environment. One can have multiple environments  in the file, but each of those needs to have values for `codeBaseBucket` and `codeBaseBucketRegion`. When running the script, the environment should be informed as the first argument and the respective value will be used when reading the file. <br><br>Description of the keys in the deploymentValues.yaml:
- `codeBaseBucket` is the S3 bucket name
- `codeBaseBucketRegion` is the region where the S3 bucket is located
- `version` which will be used as the main folder in the bucket (will be ignored if a second argument is provided to the build script)
- `apiGatewayUrlSSMParamName` is the SSM parameter name where the API gateway URL will be placed
- `onboardingPathSSMParamName` is the SSM parameter name where the onboarding endpoint path will be placed
- `proxyServerSSMParamName` is the SSM parameter name where the proxy server address will be placed
- `breakoutRegionSSMParamName` is the SSM parameter name where the VPN breakout region will be placed
- `openVPNCredentialsSecretName` is the AWS Secrets name where the OpenVPN credentials will be placed.
- `onboardingApiKeyName` is the name of the API Key used in the Onboarding API Gateway.

### The script

The build script starts by installing some tools, namely ZIP, WGET, and YQ. Those packages can only be installed if `apt` or `apk` package manager is available. The second step will be checking and extracting the values from `deploymentValues.yaml`. Then, all the node dependencies will be installed using `npm ci` just before bundling and zipping it. Finally, all the files will be moved to the build folder, and values extracted from `deploymentValues.yaml` placed in the right spots. Now, the project is ready to go.

```sh
./scripts/build.sh {{ENVIRONMENT}} {{VERSION}}
```

## CFN Templates publishing to the AWS S3 bucket

For Device Onboarding stack rollout all CFN templates and other supporting files must be uploaded to the public S3 bucket. For convenience, S3 bucket with the publicly available script files is already created and available for everyone interested to try this solution. In case if customer wants to host his own S3 bucket, there is available a special Shell script  to publish all files `./scripts/publish.sh`.

Prerequisites before running the script:
- AWS S3 bucket with "Public" access rights is created
- Non expired AWS credentials are available for AWS CLI under default profile, with the rights to upload files to the S3 bucket
- Python pip command is available in CLI
- Solution is compiled and prepared in the build folder using `./scripts/build.sh` script
- `deploymentValues.yaml` file is available and contains version number and name of the `codeBaseBucket` under according environment name


Script must be executed with sudo permissions, because it is installing yq which is needed for yaml parameter file reading.
Following command can be used:
```sh
sudo ./scripts/publish.sh dev V1.0.0 latest
```
Script input parameters:

|Parameter Index | Parameter name  | Mandatory   | Description |
|----------------| --------------- | ------------- | --------- |
| 1              | environment     | Yes           | parameters group name from the `deploymentValues.yaml` file. Will use  `codeBaseBucket` value from that group |
| 2              | version-number  | No            | Non mandatory parameter, default value will be taken from `version` value in `deploymentValues.yaml` file. All files are uploaded to folder with the name of this parameter on S3 bucket |
| 3              | latest          | No            | Non mandatory parameter, if provided uploads `device-onboarding-main.yaml` file to the latest folder in the bucket |

# Delete and cleanup process

If the stack is being deleted, then the majority of resources will be deleted by the CFN stack. Some of the resources still need to be cleaned/deleted manually:

- IoT Core Things
- IoT Core Certs
- IoT Core Policy

# FAQ

Q: My SIMs were migrated to a different 1NCE organization and stopped working.<br />
A: If SIMs were migrated to a different 1NCE organization, this means that SIM will not be returned via [Get ALL SIMs](https://help.1nce.com/dev-hub/reference/getsimsusingget) Endpoint. Therefore [SIM retrieval lambda](#sim-retrieval-lambda) will send an SQS message to disable the SIM. SIM is being disabled by setting the certificate in DynamoDB as `a: false`. When onboarding will be called for such SIM card a message `{"message":"Device with the IP=1.2.3.4 is not active"}$` with 404 status code will be returned.

# Asking for help

The most effective communication with our team is through GitHub. Simply create a [new issue](https://github.com/1NCE-GmbH/1nce-iot-device-onboarding/issues/new/choose) and select from a range of templates covering bug reports, feature requests, documentation issues, or General Questions.

# Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for information on contributing

# Change log

[Change log file](CHANGELOG.md)
