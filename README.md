# Resolve Onboarding Page

This is the dark-themed onboarding flow for Resolve IT automation platform.

## Features

- Two-tier pricing (Basic and Premium with Rita AI)
- Jira and ServiceNow integration
- AI-powered ticket analysis
- Rita AI Customer Service Agent (Premium tier)

## How to Deploy to GitHub Pages

1. Create a new GitHub repository (e.g., `resolve-onboarding`)

2. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/resolve-onboarding.git
   cd resolve-onboarding
   ```

3. Copy the `index.html` file to your repository

4. Commit and push:
   ```bash
   git add index.html
   git commit -m "Add Resolve onboarding page"
   git push origin main
   ```

5. Enable GitHub Pages:
   - Go to your repository on GitHub
   - Click on "Settings"
   - Scroll down to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

6. Your site will be available at:
   `https://YOUR_USERNAME.github.io/resolve-onboarding/`

## Local Testing

To test locally, simply open `index.html` in your web browser.

## Notes

- The Jira API integration will not work due to CORS restrictions, but the demo mode will activate automatically
- All styling and JavaScript are embedded in the HTML file for easy deployment