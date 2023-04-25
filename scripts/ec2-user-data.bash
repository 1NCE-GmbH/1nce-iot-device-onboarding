#!/bin/bash
apt-get update -y
apt-get install -y openvpn net-tools unzip curl nginx jq
# Save SNS topic names
region=`curl http://169.254.169.254/latest/meta-data/placement/region`
aws_account=`curl -s http://169.254.169.254/latest/dynamic/instance-identity/document | jq -r .accountId`

SNS_SUCCESS_TOPIC_ARN=arn:aws:sns:$region:$aws_account:replace_with_sns_success_topic_name
SNS_FAILURE_TOPIC_ARN=arn:aws:sns:$region:$aws_account:replace_with_sns_failure_topic_name
# Function for publishing to SNS regarding failures
FAILURE_FOUND=false
send_sns_failure_on_error () {
    res=$?
    if [ $res -ne 0 ]; then
        echo "Sending SNS Failure message"
        FAILURE_FOUND=true
        aws sns publish --topic-arn $SNS_FAILURE_TOPIC_ARN --message "{\"message\": \"$1\", \"timestamp\": $EPOCHSECONDS}"
    fi
}
# Function For Getting value from SSM parametrs
GLOBAL_SSM_PARAMETER=''
get_ssm_parameter () {
    GLOBAL_SSM_PARAMETER=`aws ssm get-parameter --name $1`
    send_sns_failure_on_error "EC2 Get SSM parameter $1 failure"
}
# Download and install AWS
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
# Get breakout region
get_ssm_parameter "replace_with_ssm_param_name_to_breakout_region"
breakout_region=$(echo $GLOBAL_SSM_PARAMETER | jq -r '.Parameter.Value')
# Download and save OpenVPN configuration according to breakout region
aws s3api get-object --bucket "replace_with_code_bucket_name" --key "replace_with_version/openVpnConfig/$breakout_region.conf" "/etc/openvpn/openvpn-1nce-client.conf"
send_sns_failure_on_error "EC2 Get Breakout Region Config from S3 bucket Failure"
# Get and Save OpenVPN credentials file
openvpn_credentials_secret=`aws secretsmanager get-secret-value --secret-id replace_with_secret_name_to_openvpn_creds`
send_sns_failure_on_error "EC2 Get Secretsmanager secret replace_with_secret_name_to_openvpn_credsFailure"
openvpn_credentials=$(echo $openvpn_credentials_secret | jq -r '.SecretString')
echo -e "$(echo $openvpn_credentials | jq -r '.username')\n$(echo $openvpn_credentials | jq -r '.password')" > /etc/openvpn/credentials.txt
# Start OpenVPN as a service
sudo systemctl start openvpn@openvpn-1nce-client
# Wait for tun0 interface to be present
ifc=tun0
loop_iteration=0
iteration_count=40
while [ $loop_iteration -le $iteration_count ] ; do
    ifconfig $ifc
    res=$?
    if [ $res -eq 0 ]; then
       echo Interface $ifc is present
       break
    fi
    echo Waiting for interface $ifc
    sleep 3
    (( loop_iteration++ ))
done

if [ $loop_iteration -gt $iteration_count ]; then
    echo "Sending SNS Failure message"
    FAILURE_FOUND=true
    aws sns publish --topic-arn $SNS_FAILURE_TOPIC_ARN --message "{\"message\": \"EC2 openVpn service failed to init $ifc interface\", \"timestamp\": $EPOCHSECONDS}"
fi

# Get OpenVPN tunnel ip address
ip_uncut=`ifconfig $ifc | grep -i netmask`
ip_endcut=${ip_uncut#*inet}
ip=${ip_endcut%  netmask*}
# Store OpenVPN tunnel ip address in SSM
get_ssm_parameter "replace_with_ssm_param_name_to_onboarding_path"
onboarding_path=$(echo $GLOBAL_SSM_PARAMETER | jq -r '.Parameter.Value')

aws ssm put-parameter --name replace_with_ssm_param_name_to_proxy_server --value "$ip:replace_with_nginx_port/$onboarding_path" --type String --overwrite
send_sns_failure_on_error "EC2 put SSM parameter replace_with_ssm_param_name_to_proxy_server failure"
# Get and export Nginx config as env variables
get_ssm_parameter "replace_with_ssm_param_name_to_api_gateway_url"
export ONBOARDING_ENDPOINT=$(echo $GLOBAL_SSM_PARAMETER | jq -r '.Parameter.Value')

apigateway_onbarding_x_api_key_response=`aws apigateway get-api-keys --name-query "replace_with_onboarding_api_key_name" --include-values`
send_sns_failure_on_error "EC2 Get apigateway keys replace_with_onboarding_api_key_name failure"
export ONBOARDING_X_API_KEY=$(echo $apigateway_onbarding_x_api_key_response | jq -r '.items[0].value')

export NGINX_PORT=replace_with_nginx_port
export DOLLAR="$" # needed to escape nginx built-in env variables
# Download Nginx template and set the server
aws s3api get-object --bucket "replace_with_code_bucket_name" --key "replace_with_version/nginxConfig/nginx.conf" "/etc/nginx/conf.d/my-template.conf.template"
send_sns_failure_on_error "EC2 Get Nginx Config from S3 bucket Failure"
envsubst < /etc/nginx/conf.d/my-template.conf.template > /etc/nginx/sites-available/default
sudo chmod 644 /etc/nginx/sites-available/default
# Run Nginx server as a service
sudo systemctl stop nginx
sudo systemctl start nginx
sudo systemctl enable nginx

sleep 5 # Give some time to start the service
cat "/var/run/nginx.pid"
send_sns_failure_on_error "EC2 Nginx server failure"

# Send Success Message to SNS
if [ $FAILURE_FOUND = false ]; then
    echo "Sending SNS Success message"
    aws sns publish --topic-arn $SNS_SUCCESS_TOPIC_ARN --message "{\"message\": \"EC2 instance for onboarding service configured correctly\", \"timestamp\": $EPOCHSECONDS}"
fi
# Reboot machine
reboot
