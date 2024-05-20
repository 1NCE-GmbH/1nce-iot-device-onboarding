#!/bin/sh

if [ -z "$1" ]; then
    echo "ERROR: No environment supplied"
    exit 1
fi

if ! which pip > /dev/null; then
    echo "ERROR: pip is missing"
    exit 1
fi

echo "Preparing script..."

pip install awscli
wget -q https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && chmod +x /usr/bin/yq

echo "Reading deployment values from deploymentValues.yaml file for $1 environment..."

## Get values from deploymentValues file
get_version=$(yq '.version' deploymentValues.yaml)
version="${2:-$get_version}"
cfn_codebase_bucket=$(myenv=$1 yq '.[env(myenv)].codeBaseBucket' deploymentValues.yaml)

echo "Publishing template files to AWS S3 bucket $cfn_codebase_bucket folder '$version'"

## Validate if build directory exists
if [ ! -d "build" ]; then
    echo "ERROR: 'build' directory is missing, please first build/bundle solution using build script"
    exit 1
fi    

## Copy templates to S3 bucket
aws s3 cp build s3://"$cfn_codebase_bucket"/"$version"/ --recursive || exit 1

if [ -n "$3" ]; then
    echo "Publishing main template file to AWS S3 bucket $cfn_codebase_bucket folder 'latest'"
    aws s3 cp build/device-onboarding-main.yaml s3://"$cfn_codebase_bucket"/latest/ || exit 1
fi

echo "Templates publishing complete"

exit 0
