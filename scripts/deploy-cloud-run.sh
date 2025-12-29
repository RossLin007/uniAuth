#!/bin/bash

# Cloud Run Deployment Script for UniAuth
# Deploys API, Web, and Console services
# Usage: ./scripts/deploy-cloud-run.sh [service]
#   service: api, web, console (optional, defaults to all)

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="asia-east1" # Change to your preferred region
REPO_NAME="uniauth"
SERVICE=${1:-all}

echo "🚀 Starting deployment to Google Cloud Run..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Target: $SERVICE"

# Helper to generate robust env.yaml using external Node.js script
prepare_env_file() {
    echo "Generating env.yaml..."
    node "$(dirname "$0")/generate-env-yaml.cjs"
}

# 1. Deploy API Service
deploy_api() {
    echo "--------------------------------------------------"
    echo "📦 Building and Deploying API Service..."
    echo "--------------------------------------------------"
    
    prepare_env_file
    
    # API Dockerfile is at root, so we don't need -f or config
    gcloud builds submit --tag gcr.io/$PROJECT_ID/uniauth-api .

    gcloud run deploy uniauth-api \
      --image gcr.io/$PROJECT_ID/uniauth-api \
      --region $REGION \
      --platform managed \
      --allow-unauthenticated \
      --port 3000 \
      --env-vars-file env.yaml
      
    API_URL=$(gcloud run services describe uniauth-api --region $REGION --format 'value(status.url)')
    echo "✅ API Service Deployed at: $API_URL"
    export API_URL
    rm -f env.yaml
}

# 2. Deploy Web Frontend (auth.55387.xyz)
deploy_web() {
    # Use custom domain for API instead of Cloud Run URL
    # This ensures OAuth redirects work correctly through the custom domain
    WEB_API_URL="${CUSTOM_API_URL:-https://sso.55387.xyz}"

    echo "--------------------------------------------------"
    echo "📦 Building and Deploying Web Frontend..."
    echo "--------------------------------------------------"
    echo "Using API URL: $WEB_API_URL"
    
    # Use cloudbuild.yaml for proper build-arg support
    gcloud builds submit --config packages/web/cloudbuild.yaml \
      --substitutions=_API_URL=$WEB_API_URL .

    gcloud run deploy uniauth-web \
      --image gcr.io/$PROJECT_ID/uniauth-web:latest \
      --region $REGION \
      --platform managed \
      --allow-unauthenticated \
      --port 80
}

# 3. Deploy Developer Console
deploy_console() {
    # Use custom domain for API instead of Cloud Run URL
    # This ensures OAuth redirects work correctly through the custom domain
    CONSOLE_API_URL="${CUSTOM_API_URL:-https://sso.55387.xyz}"

    echo "--------------------------------------------------"
    echo "📦 Building and Deploying Developer Console..."
    echo "--------------------------------------------------"
    echo "Using API URL: $CONSOLE_API_URL"
    
    # Use cloudbuild.yaml for proper build-arg support
    gcloud builds submit --config packages/developer-console/cloudbuild.yaml \
      --substitutions=_API_URL=$CONSOLE_API_URL .

    gcloud run deploy uniauth-console \
      --image gcr.io/$PROJECT_ID/uniauth-console:latest \
      --region $REGION \
      --platform managed \
      --allow-unauthenticated \
      --port 80
}

case "$SERVICE" in
    api)
        deploy_api
        ;;
    web)
        deploy_web
        ;;
    console)
        deploy_console
        ;;
    all)
        deploy_api
        deploy_web
        deploy_console
        ;;
    *)
        echo "Usage: $0 {api|web|console|all}"
        exit 1
        ;;
esac

echo "--------------------------------------------------"
echo "✅ Deployment Complete!"
echo "--------------------------------------------------"
if [ "$SERVICE" == "api" ] || [ "$SERVICE" == "all" ]; then
    echo "API:     $(gcloud run services describe uniauth-api --region $REGION --format 'value(status.url)')"
fi
if [ "$SERVICE" == "web" ] || [ "$SERVICE" == "all" ]; then
    echo "Web:     $(gcloud run services describe uniauth-web --region $REGION --format 'value(status.url)')"
fi
if [ "$SERVICE" == "console" ] || [ "$SERVICE" == "all" ]; then
    echo "Console: $(gcloud run services describe uniauth-console --region $REGION --format 'value(status.url)')"
fi
