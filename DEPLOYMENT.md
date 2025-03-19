# Secure Deployment Guide for Tara UI

This guide explains how to securely deploy the Tara UI application to Netlify while keeping sensitive credentials protected.

## Before You Begin

You'll need:
- A GitHub account
- A Netlify account
- Access to the required API keys (LiveKit, Supabase)
- The Netlify CLI installed: `npm install -g netlify-cli`

## Securing Environment Variables

Never commit sensitive credentials to your GitHub repository. Instead, follow these steps:

1. Create a local `.env.local` file for development:
   ```
   # Copy the template
   cp .env.example .env.local
   
   # Edit and add your keys
   nano .env.local
   ```

2. Create a separate `netlify.env` file for deployment:
   ```
   # Copy the template
   cp netlify.env.template netlify.env
   
   # Edit and add your production keys
   nano netlify.env
   ```

3. Ensure both files are in your `.gitignore` to prevent accidental commits.

## Deploying to Netlify via the Dashboard

1. Log in to [Netlify](https://app.netlify.com/)

2. Create a new site from your GitHub repository:
   - Click "New site from Git"
   - Connect to GitHub and select your repository
   - Configure build settings:
     - Base directory: `tara-ui`
     - Build command: `npm run build`
     - Publish directory: `tara-ui/.next`

3. Add Environment Variables:
   - Go to Site settings > Environment variables
   - Add each variable from your `netlify.env` file
   - Mark sensitive variables (like API keys and secrets) as "Sensitive"

4. Deploy your site.

## Deploying to Netlify via CLI (More Secure)

Using the Netlify CLI offers more security for your environment variables:

1. Link your local project to your Netlify site:
   ```bash
   cd tara-ui
   netlify login
   netlify link
   ```

2. Import your environment variables securely:
   ```bash
   netlify env:import netlify.env
   ```

3. Deploy your site:
   ```bash
   netlify deploy --prod
   ```

## Continuous Deployment with GitHub Actions

This repository includes a GitHub Actions workflow that deploys to Netlify on pushes to main.

To set it up:

1. Add these secrets to your GitHub repository:
   - `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
   - `NETLIFY_SITE_ID`: Your Netlify site ID
   - `DEPLOYMENT_AUTH_TOKEN`: A custom token you create to authorize deployments

2. The workflow will:
   - Verify authorization for forks
   - Build your project
   - Deploy to Netlify

## Security Best Practices

1. **Rotate credentials regularly**: Update your API keys and tokens every few months.

2. **Use environment-specific variables**: Use different keys for development and production.

3. **Restrict domain access**: In LiveKit and Supabase dashboards, restrict access to your Netlify domain.

4. **Monitor deployments**: Review Netlify and GitHub logs regularly for unauthorized access attempts.

5. **Enable branch protection**: Require pull request reviews before merging to main.

Remember that this is a proprietary application. Keep the source code and credentials secure at all times. 