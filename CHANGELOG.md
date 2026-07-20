# Changelog for 1NCE IoT Device Onboarding

## v1.0.0 (March 2023)

This is the first release of a 1NCE IoT Device Onboarding in this repository.

## v1.0.1 (July 2023)

Support Asia Pacific (ap-northeast-1) Breakout Region

## v1.0.2 (October 2023)

Use AWS IoT Core "ATS signed data endpoint" as MQTT broker endpoint URL.

## v2.0.0 (March 2024)

Upgrade Node version from 14 to 18 and multiple project dependencies.

## v2.0.1 (March 2024)

Add workaround to avoid stale connections when DNS host changes IP address.

## v2.0.2 (July 2024)

Fix Nginx resolver configuration to avoid 499 http error codes.
In main CFN template allow to select between t2.micro and t3a.micro EC2 instance types.

## v2.1.0 (June 2025)

Lambda runtimes have been updated to Node.js 22.x and Python 3.13. Project dependencies were also upgraded.

## v2.2.0 (July 2026)

Add support for the 1NCE New Platform (v2). A `PlatformVersion` parameter (`v1`|`v2`, default `v1`) on the main CFN template selects whether the SIM Retrieval Lambda calls `GET /v1/sims` or `GET /v2/sims`.
Lambda runtimes have been updated to Node.js 24.x.
Reassign the VPC and subnet CIDR ranges in the network template. The VPC now uses `9.0.0.0/24`, with the public subnet on `9.0.0.0/25` and the private subnet on `9.0.0.128/25` (previously allocated within the `10.0.0.0/24` range).
