#!/usr/bin/env bash

set -o pipefail

app_id=$GITHUB_APP_ID
pem=$GITHUB_PRIVATE_KEY
installation_id=$GITHUB_INSTALLATION_ID

now=$(date +%s)
iat=$((${now} - 60)) # Issues 60 seconds in the past
exp=$((${now} + 600)) # Expires 10 minutes in the future

b64enc() { openssl base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n'; }

header_json='{
    "typ":"JWT",
    "alg":"RS256"
}'
# Header encode
header=$( echo -n "${header_json}" | b64enc )

payload_json="{
    \"iat\":${iat},
    \"exp\":${exp},
    \"iss\":\"${app_id}\"
}"
# Payload encode
payload=$( echo -n "${payload_json}" | b64enc )

# Signature
header_payload="${header}"."${payload}"
signature=$(
    openssl dgst -sha256 -sign <(echo -n "${pem}") \
    <(echo -n "${header_payload}") | b64enc
)

# Create JWT
JWT="${header_payload}"."${signature}"

auth_token=$(curl --request POST \
 --url "https://api.github.com/app/installations/${installation_id}/access_tokens" \
 --header "Accept: application/vnd.github+json" \
 --header "Authorization: Bearer ${JWT}" \
 --header "X-GitHub-Api-Version: 2022-11-28" \
 --data '{"repositories": ["altitude"]}' | jq -r '.token')

deployment_id=$(cat /tmp/deployment)
status_arg=$1
description=$2

if [ -z "${deployment_id}" ]; then
    echo "No deployment found"
    exit 1
fi

environment_url="${DEPLOYMENT_URL:-https://dev.gainaltitude.ai}"

(curl --request POST \
    --url "https://api.github.com/repos/Waystone-Software/altitude/deployments/${deployment_id}/statuses" \
    --header "Accept: application/vnd.github+json" \
    --header "Authorization: Bearer ${auth_token}" \
    --header "X-GitHub-Api-Version: 2022-11-28" \
    --data "{\"state\": \"${status_arg}\", \"environment_url\": \"${environment_url}\", \"description\": \"${description}\"}") > /dev/null