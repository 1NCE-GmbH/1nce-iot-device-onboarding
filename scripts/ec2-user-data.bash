#!/bin/bash
apt-get update -y
apt-get install -y openvpn net-tools unzip curl nginx jq
# Download and install AWS
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
# Get breakout region
breakout_region=$(aws ssm get-parameter --name replace_with_ssm_param_name_to_breakout_region | jq -r '.Parameter.Value')
# Download and save OpenVPN configuration according to breakout region
curl https://replace_with_code_bucket_name.s3.replace_with_code_bucket_region_name.amazonaws.com/replace_with_version/openVpnConfig/$breakout_region.conf -o /etc/openvpn/openvpn-1nce-client.conf
# Get and Save OpenVPN credentials file
openvpn_credentials=$(aws secretsmanager get-secret-value --secret-id replace_with_secret_name_to_openvpn_creds | jq -r '.SecretString')
echo -e "$(echo $openvpn_credentials | jq -r '.username')\n$(echo $openvpn_credentials | jq -r '.password')" > /etc/openvpn/credentials.txt
# Start OpenVPN as a service
sudo systemctl start openvpn@openvpn-1nce-client
# Wait for tun0 interface to be present
ifc=tun0
while true; do
    ifconfig $ifc
    res=$?
    if [ $res -eq 0 ]; then
       echo Interface $ifc is present
       break
    fi
    echo Waiting for interface $ifc
    sleep 3
done
# Get OpenVPN tunnel ip address
ip_uncut=`ifconfig $ifc | grep -i netmask`
ip_endcut=${ip_uncut#*inet}
ip=${ip_endcut%  netmask*}
# Store OpenVPN tunnel ip address in SSM
onboarding_path=$(aws ssm get-parameter --name replace_with_ssm_param_name_to_onboarding_path | jq -r '.Parameter.Value')
aws ssm put-parameter --name replace_with_ssm_param_name_to_proxy_server --value "$ip:replace_with_nginx_port/$onboarding_path" --type String --overwrite
# Get and export Nginx config as env variables
export ONBOARDING_ENDPOINT=$(aws ssm get-parameter --name replace_with_ssm_param_name_to_api_gateway_url | jq -r '.Parameter.Value')
export ONBOARDING_X_API_KEY=$(aws apigateway get-api-keys --name-query replace_with_onboarding_api_key_name --include-values | jq -r '.items[0].value')
export NGINX_PORT=replace_with_nginx_port
export DOLLAR="$" # needed to escape nginx built-in env variables
# Download Nginx template and set the server
curl https://replace_with_code_bucket_name.s3.replace_with_code_bucket_region_name.amazonaws.com/replace_with_version/nginxConfig/nginx.conf -o /etc/nginx/conf.d/my-template.conf.template
envsubst < /etc/nginx/conf.d/my-template.conf.template > /etc/nginx/sites-available/default
sudo chmod 644 /etc/nginx/sites-available/default
# Run Nginx server as a service
sudo systemctl stop nginx
sudo systemctl start nginx
sudo systemctl enable nginx
# Reboot machine
reboot
