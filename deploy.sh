#!/bin/bash

# Simple deployment script for GitHub Pages
# Usage: ./deploy.sh

echo "🚀 Deploying to GitHub Pages..."

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Please run 'git init' first."
    exit 1
fi

# Check if remote origin exists
if ! git remote | grep -q "origin"; then
    echo "❌ Error: No remote origin set. Please add your GitHub repository as origin."
    echo "Example: git remote add origin https://github.com/YOUR_USERNAME/resolve-onboarding.git"
    exit 1
fi

# Add all files
git add .

# Commit changes
echo "📝 Enter commit message (or press Enter for default):"
read commit_message
if [ -z "$commit_message" ]; then
    commit_message="Update onboarding page"
fi

git commit -m "$commit_message"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at your GitHub Pages URL in a few minutes."
echo "   Check Settings > Pages in your GitHub repository for the URL."