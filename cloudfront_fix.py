#!/usr/bin/env python3
"""
CloudFront Fix Script
Removes Lambda SSR origin and /posts/* cache behavior to restore static site routing
Uses AWS CLI (no boto3 dependency required)
"""

import json
import subprocess
import sys

DISTRIBUTION_ID = "E8A9C5FXPTO0X"

def run_aws_command(command):
    """Run AWS CLI command and return parsed JSON output"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}", file=sys.stderr)
        print(f"Error output: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    print(f"Fetching CloudFront distribution config for {DISTRIBUTION_ID}...")

    # Get current distribution config
    response = run_aws_command(
        f"aws cloudfront get-distribution-config --id {DISTRIBUTION_ID}"
    )

    config = response['DistributionConfig']
    etag = response['ETag']

    print(f"Current ETag: {etag}")
    print(f"Current origins: {config['Origins']['Quantity']}")
    print(f"Current cache behaviors: {config['CacheBehaviors']['Quantity']}")

    # Remove Lambda origin
    original_origins_count = config['Origins']['Quantity']
    config['Origins']['Items'] = [
        origin for origin in config['Origins']['Items']
        if origin['Id'] != 'lambda-ssr-origin'
    ]
    config['Origins']['Quantity'] = len(config['Origins']['Items'])

    if config['Origins']['Quantity'] < original_origins_count:
        print(f"✓ Removed lambda-ssr-origin")
    else:
        print("⚠ Lambda origin not found (already removed?)")

    # Remove /posts/* cache behavior
    original_behaviors_count = config['CacheBehaviors']['Quantity']
    config['CacheBehaviors']['Items'] = [
        behavior for behavior in config['CacheBehaviors']['Items']
        if behavior['PathPattern'] != '/posts/*'
    ]
    config['CacheBehaviors']['Quantity'] = len(config['CacheBehaviors']['Items'])

    if config['CacheBehaviors']['Quantity'] < original_behaviors_count:
        print(f"✓ Removed /posts/* cache behavior")
    else:
        print("⚠ /posts/* cache behavior not found (already removed?)")

    # Write updated config to temp file
    config_file = '/tmp/cloudfront-config.json'
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)

    print(f"\nUpdating CloudFront distribution...")

    # Update distribution using AWS CLI
    update_command = f"""aws cloudfront update-distribution \
        --id {DISTRIBUTION_ID} \
        --distribution-config file://{config_file} \
        --if-match {etag}"""

    update_response = run_aws_command(update_command)

    print(f"\n✓ Distribution updated successfully!")
    print(f"New ETag: {update_response['ETag']}")
    print(f"Status: {update_response['Distribution']['Status']}")
    print(f"\nOrigins: {config['Origins']['Quantity']}")
    print(f"Cache behaviors: {config['CacheBehaviors']['Quantity']}")

    print("\n" + "="*60)
    print("IMPORTANT: CloudFront is now deploying the changes.")
    print("This typically takes 5-15 minutes to propagate globally.")
    print("="*60)
    print("\nYou can check deployment status with:")
    print(f"aws cloudfront get-distribution --id {DISTRIBUTION_ID} --query 'Distribution.Status'")

    print("\nOnce deployed, all requests (including /posts/*) will route to S3.")

if __name__ == "__main__":
    main()
