#!/bin/bash

# Cloud Run Deployment Script for UniAuth
# Deploys API, Web, and Console services

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="asia-east1" # Change to your preferred region, e.g., us-central1
REPO_NAME="uniauth"

echo "🚀 Starting deployment to Google Cloud Run..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# 1. Deploy API Service
echo "--------------------------------------------------"
echo "📦 Building and Deploying API Service..."
echo "--------------------------------------------------"
# Build API Image
gcloud builds submit --tag gcr.io/$PROJECT_ID/uniauth-api -f Dockerfile .

# Deploy API Service
gcloud run deploy uniauth-api \
  --image gcr.io/$PROJECT_ID/uniauth-api \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production

# Get the API URL
API_URL=$(gcloud run services describe uniauth-api --region $REGION --format 'value(status.url)')
echo "✅ API Service Deployed at: $API_URL"

# 2. Deploy Web Frontend
echo "--------------------------------------------------"
echo "📦 Building and Deploying Web Frontend..."
echo "--------------------------------------------------"
# Build Web Image (context is root to access shared packages)
gcloud builds submit --tag gcr.io/$PROJECT_ID/uniauth-web \
  --substitutions=_API_URL=$API_URL \
  --build-arg VITE_API_URL=$API_URL \
  -f packages/web/Dockerfile .

# Deploy Web Service
gcloud run deploy uniauth-web \
  --image gcr.io/$PROJECT_ID/uniauth-web \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 80

# 3. Deploy Developer Console
echo "--------------------------------------------------"
echo "📦 Building and Deploying Developer Console..."
echo "--------------------------------------------------"
# Build Console Image
gcloud builds submit --tag gcr.io/$PROJECT_ID/uniauth-console \
  --substitutions=_API_URL=$API_URL \
  --build-arg VITE_API_URL=$API_URL \
  -f packages/developer-console/Dockerfile .

# Deploy Console Service
gcloud run deploy uniauth-console \
  --image gcr.io/$PROJECT_ID/uniauth-console \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 80

echo "--------------------------------------------------"
echo "✅ Deployment Complete!"
echo "--------------------------------------------------"
echo "Services:"
echo "API:     $(gcloud run services describe uniauth-api --region $REGION --format 'value(status.url)')"
echo "Web:     $(gcloud run services describe uniauth-web --region $REGION --format 'value(status.url)')"
echo "Console: $(gcloud run services describe uniauth-console --region $REGION --format 'value(status.url)')"
