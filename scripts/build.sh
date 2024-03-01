#!/bin/sh
os=$(uname | sed -n '/^Linux/p')
if [ -z "$os" ]; then
    echo "ERROR: This script is only supported by Linux systems. Actual: $(uname)"
    exit 1
fi
if [ -z "$1" ]; then
    echo "ERROR: No environment supplied"
    exit 1
fi
node_version=$(node -v | sed -En '/^v([1-9][8-9]|[2-9][[:digit:]])[[:digit:]]*.[[:digit:]]+.[[:digit:]]+$/p')
if [ -z "$node_version" ]; then
    echo "ERROR: Node 18 or posterior is missing. Actual: $(node -v)"
    exit 1
fi

echo "Installing tools..."
if which apt-get; then
    apt-get update -y
    apt-get install zip wget -y
elif which apk; then
    apk -U add zip wget
else
    echo "ERROR: This script is only supported when apt-get or apk is available"
    exit 1
fi

wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && chmod +x /usr/bin/yq

echo "Retrieving values from deploymentValues.yaml..."
get_version=$(yq '.version' deploymentValues.yaml)
version="${2:-$get_version}"
if [ -z "$version" ]; then
    echo "ERROR: No version provided in the deploymentValues.yaml nor in the script arguments"
    exit 1
fi
api_gateway_url_ssm_param_name=$(yq '.apiGatewayUrlSSMParamName' deploymentValues.yaml)
onboarding_path_ssm_param_name=$(yq '.onboardingPathSSMParamName' deploymentValues.yaml)
proxy_server_ssm_param_name=$(yq '.proxyServerSSMParamName' deploymentValues.yaml)
breakout_region_ssm_param_name=$(yq '.breakoutRegionSSMParamName' deploymentValues.yaml)
openvpn_creds_secret_name=$(yq '.openVPNCredentialsSecretName' deploymentValues.yaml)
onboarding_api_key_name=$(yq '.onboardingApiKeyName' deploymentValues.yaml)
sns_failure_topic_name=$(yq '.snsFailureTopicName' deploymentValues.yaml)
sns_success_topic_name=$(yq '.snsSuccessTopicName' deploymentValues.yaml)
nginx_port=8080
cfn_codebase_bucket=$(myenv=$1 yq '.[env(myenv)].codeBaseBucket' deploymentValues.yaml)
if [ -z "$cfn_codebase_bucket" ]; then
    echo "ERROR: No codebase bucket provided in the deploymentValues.yaml for $1 env"
    exit 1
fi
cfn_codebase_bucket_region=$(myenv=$1 yq '.[env(myenv)].codeBaseBucketRegion' deploymentValues.yaml)
if [ -z "$cfn_codebase_bucket_region" ]; then
    echo "ERROR: No codebase bucket region provided in the deploymentValues.yaml for $1 env"
    exit 1
fi

echo "Installing applications and zipping it..."
cd applications || exit 1
npm ci
echo "Bundling..."
npm run bundle
echo "Zipping..."
npm run zip:all

echo "Moving files to build folder..."
cd ..
rm -rf build/
cp -r templates/ build/
cp scripts/ec2-user-data.bash build/
cp -r nginxConfig/ build/nginxConfig/
cp -r openVpnConfig/ build/openVpnConfig/
mkdir build/lambda
cp -r applications/dist/**/*.zip build/lambda/

echo "Replacing values in the ec2-user-data.bash script..."
sed -i s,replace_with_version,"$version",g build/ec2-user-data.bash
sed -i s,replace_with_code_bucket_name,"$cfn_codebase_bucket",g build/ec2-user-data.bash
sed -i s,replace_with_code_bucket_region_name,"$cfn_codebase_bucket_region",g build/ec2-user-data.bash
sed -i s,replace_with_ssm_param_name_to_api_gateway_url,"$api_gateway_url_ssm_param_name",g build/ec2-user-data.bash
sed -i s,replace_with_ssm_param_name_to_onboarding_path,"$onboarding_path_ssm_param_name",g build/ec2-user-data.bash
sed -i s,replace_with_ssm_param_name_to_proxy_server,"$proxy_server_ssm_param_name",g build/ec2-user-data.bash
sed -i s,replace_with_ssm_param_name_to_breakout_region,"$breakout_region_ssm_param_name",g build/ec2-user-data.bash
sed -i s,replace_with_secret_name_to_openvpn_creds,"$openvpn_creds_secret_name",g build/ec2-user-data.bash
sed -i s,replace_with_onboarding_api_key_name,"$onboarding_api_key_name",g build/ec2-user-data.bash
sed -i s,replace_with_nginx_port,"$nginx_port",g build/ec2-user-data.bash
sed -i s,replace_with_sns_success_topic_name,"$sns_success_topic_name",g build/ec2-user-data.bash
sed -i s,replace_with_sns_failure_topic_name,"$sns_failure_topic_name",g build/ec2-user-data.bash

echo "Replacing values in the device-onboarding-main.yaml template..."
sed -i s,replace_with_version,"$version",g build/device-onboarding-main.yaml
sed -i s,replace_with_code_bucket_name,"$cfn_codebase_bucket",g build/device-onboarding-main.yaml
sed -i s,replace_with_code_bucket_region_name,"$cfn_codebase_bucket_region",g build/device-onboarding-main.yaml
sed -i s,replace_with_ssm_param_name_to_api_gateway_url,"$api_gateway_url_ssm_param_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_ssm_param_name_to_onboarding_path,"$onboarding_path_ssm_param_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_ssm_param_name_to_proxy_server,"$proxy_server_ssm_param_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_ssm_param_name_to_breakout_region,"$breakout_region_ssm_param_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_secret_name_to_openvpn_creds,"$openvpn_creds_secret_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_onboarding_api_key_name,"$onboarding_api_key_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_sns_success_topic_name,"$sns_success_topic_name",g build/device-onboarding-main.yaml
sed -i s,replace_with_sns_failure_topic_name,"$sns_failure_topic_name",g build/device-onboarding-main.yaml

echo "Replacing values in the autoscaling.yaml template..."
encoded_user_data=$(base64 -w0 build/ec2-user-data.bash)
sed -i s,replace_with_user_data_base_64_script,"$encoded_user_data",g build/autoscaling.yaml

echo "Cleaning the clutter..."
rm -rf build/ec2-user-data.bash

echo "Build complete"
