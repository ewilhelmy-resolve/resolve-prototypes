# 🚀 Quick Start Guide - Resolve Onboarding

## Login in 3 Steps

### 1️⃣ Start the Backend
```bash
node server-backend.js
```
✅ Auto-seeds john@resolve.io

### 2️⃣ Access the Site
```
http://localhost:8081
```

### 3️⃣ Login
- Click **"Already have an account? Log in here"**
- Email: `john@resolve.io`
- Password: `!Password1`

---

## What Happens After Login?

### For john@resolve.io (Premium User):
- ⚡ **Redirects directly to `/jarvis.html`**
- No trial signup
- No payment forms
- Immediate access to Jarvis AI Assistant

### For New Users:
- Goes through full onboarding flow
- Plan selection → Integration → Payment → Success

---

## Quick Commands

### Check if Backend is Running
```bash
curl http://localhost:3001/api/health
```

### Restart Everything
```bash
# Kill backend
pkill -f "node server"

# Restart Docker frontend
docker-compose restart

# Start backend
node server-backend.js
```

### View Logs
```bash
# Backend logs
tail -f server.log

# Docker logs
docker logs resolve-onboarding-web-1
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Invalid credentials" | Password is `!Password1` (lowercase 'a') |
| Backend not responding | Run `node server-backend.js` |
| Port 3001 in use | `lsof -i :3001` then kill the process |
| Frontend not loading | `docker-compose up -d` |
| Login link not visible | Hard refresh: Ctrl+Shift+R |

---

## Architecture at a Glance

```
User → localhost:8081 (Frontend/nginx)
         ↓
    SignupForm Component
         ↓
    API Client Module
         ↓
    localhost:3001 (Backend/Express)
         ↓
    In-Memory Database
    (Auto-seeded with john@resolve.io)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server-backend.js` | Backend API server |
| `components/api-client.js` | Frontend-backend communication |
| `components/signup-form.js` | Login/Signup form component |
| `index.html` | Main application logic |

---

## Test the API Directly

### Login via cURL
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@resolve.io","password":"!Password1"}'
```

### Check Health
```bash
curl http://localhost:3001/api/health
```

---

## 🎯 Remember

- **Backend auto-seeds** on startup - no manual setup needed!
- **Password is case-sensitive**: `!Password1` 
- **Premium users skip onboarding** - straight to `/jarvis.html`
- **Frontend**: Port 8081 | **Backend**: Port 3001