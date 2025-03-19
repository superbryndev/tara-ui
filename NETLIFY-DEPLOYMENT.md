# Netlify Deployment Guide for Tara UI

This guide provides instructions for deploying the Tara UI Next.js application to Netlify to avoid 404 errors.

## Configuration Files

We've updated the following configuration files:

1. `netlify.toml` - Netlify deployment configuration
2. `next.config.ts` - Next.js build settings
3. `package.json` - Build scripts

## Deployment Steps

### 1. Environment Variables

Make sure to set these environment variables in the Netlify dashboard:

```
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=your_livekit_url_here
NEXT_PUBLIC_CONN_DETAILS_ENDPOINT=/api/connection-details
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_key_here
```

### 2. Netlify Build Settings

If configuring directly in the Netlify dashboard, use these settings:

- **Base directory**: `tara-ui`
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: `20.11.0`

### 3. Deploy Steps

1. Push your updated code to GitHub
2. Log in to Netlify Dashboard
3. Click "New site from Git"
4. Select your GitHub repository
5. Enter the build settings from step 2
6. Add environment variables from step 1
7. Click "Deploy site"

### 4. Troubleshooting 404 Errors

If you're seeing 404 errors:

1. Check if you set up all environment variables correctly
2. Verify that the build is successful in the Netlify dashboard
3. Make sure the Next.js plugin is installed
4. Check the Netlify function logs for errors related to your API routes

## Notes about API Routes

This configuration supports server-side rendering with API routes. This means:

1. The `/api/connection-details` and `/api/feedback` routes will work correctly
2. They will be processed by Netlify Functions
3. You need the `@netlify/plugin-nextjs` plugin installed and configured

## Manual Restart

If needed, you can manually restart your Netlify deployment:

1. Go to the Netlify dashboard
2. Select your site
3. Go to "Deploys"
4. Click "Trigger deploy" > "Clear cache and deploy site" 