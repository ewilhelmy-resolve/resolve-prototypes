# Login User Journey - Resolve Onboarding

## Quick Start

### Access the Application
- **URL**: http://localhost:8081
- **Backend API**: http://localhost:3001 (runs automatically)

### Default Credentials
- **Email**: `john@resolve.io`
- **Password**: `!Password1` (case-sensitive, lowercase 'a')

---

## User Journey Flow

### 1. Landing Page
When users navigate to http://localhost:8081, they see:
- **Signup form** (default view)
- **"Already have an account? Log in here"** link at the bottom

### 2. Switch to Login
Clicking "Log in here" transforms the form to show:
- Email field
- Password field
- "Log In" button
- "Don't have an account? Sign up" link

### 3. Authentication
Upon entering credentials and clicking "Log In":
- Frontend sends POST request to `http://localhost:3001/api/login`
- Backend validates credentials against in-memory database
- Returns JWT token and user profile on success

### 4. Post-Login Experience

#### For Existing Premium Users (like john@resolve.io):
- **Skips all onboarding steps**
- **Redirects directly to `/jarvis.html`**
- Shows "Jarvis AI Assistant" header
- Full-screen AI assistant interface
- No launch button needed

#### For New Users:
- Proceeds through onboarding flow:
  1. Plan selection
  2. Configuration
  3. Integration setup
  4. Payment (if applicable)
  5. Environment building
  6. Success/Chatbot page

---

## Technical Architecture

### Frontend (Port 8081)
```
nginx → index.html → SignupForm component → API Client
```

### Backend (Port 3001)
```
Express.js → In-memory DB → Auto-seeded with john@resolve.io
```

### Key Components

#### 1. Backend Server (`server-backend.js`)
- Auto-seeds john@resolve.io on startup
- Provides RESTful API endpoints
- Manages sessions with tokens
- In-memory database for fast development

#### 2. API Client (`components/api-client.js`)
- Handles all backend communication
- Manages authentication tokens
- Stores session in sessionStorage

#### 3. SignupForm Component (`components/signup-form.js`)
- Dual-mode form (signup/login)
- Integrates with backend API
- Handles form validation

#### 4. Main Application (`index.html`)
- Detects active subscriptions
- Skips onboarding for existing users
- Routes to appropriate step

---

## API Endpoints

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/health` | GET | Check backend status | `{status, users, seededUser}` |
| `/api/login` | POST | Authenticate user | `{success, token, user}` |
| `/api/signup` | POST | Register new user | `{success, token, user}` |
| `/api/logout` | POST | End session | `{success}` |
| `/api/user/:email` | GET | Get user profile | User object |
| `/api/users` | GET | List all users (admin) | Array of users |

---

## User Data Structure

The seeded john@resolve.io user includes:
```javascript
{
  email: 'john@resolve.io',
  password: '!Password1',
  company: 'Resolve',
  role: 'super_admin',
  subscription: {
    plan: 'premium',
    status: 'active',
    seats: 100
  },
  integrations: {
    jira: { connected: true },
    slack: { connected: true }
  },
  analytics: {
    ticketsAutomated: 15234,
    automationRate: 87.5
  }
}
```

---

## Running the Application

### Start Backend Server
```bash
# Automatically seeds john@resolve.io
node server-backend.js

# Or with npm
npm start
```

### Start Frontend (Docker)
```bash
# Uses nginx on port 8081
docker-compose up -d
```

### Alternative: Run Everything Locally
```bash
# Terminal 1: Backend
node server-backend.js

# Terminal 2: Simple HTTP server for frontend
python3 -m http.server 8081
```

---

## Troubleshooting

### Cannot Login
1. **Check backend is running**: 
   ```bash
   curl http://localhost:3001/api/health
   ```
2. **Verify credentials**: 
   - Email: `john@resolve.io` (exact)
   - Password: `!Password1` (case-sensitive)

### Backend Not Starting
1. **Install dependencies**:
   ```bash
   npm install express body-parser cors
   ```
2. **Check port 3001 is free**:
   ```bash
   lsof -i :3001
   ```

### Frontend Not Loading
1. **Restart Docker**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```
2. **Check port 8081**:
   ```bash
   docker ps | grep resolve
   ```

---

## Development Notes

### Auto-Seeding
- Backend automatically creates john@resolve.io on startup
- No manual database seeding required
- Persists only while server is running (in-memory)

### Session Management
- Sessions stored in sessionStorage (browser)
- Token-based authentication
- Automatic cleanup on logout

### Premium User Detection
- System checks `subscription.status === 'active'`
- Skips onboarding for active subscribers
- Direct access to Barista AI

---

## Security Considerations

### Current Implementation (Development)
- In-memory database (not persistent)
- Plain text passwords (for demo only)
- CORS enabled for all origins

### Production Recommendations
- Use PostgreSQL or MongoDB
- Implement bcrypt password hashing
- Configure CORS for specific domains
- Add rate limiting
- Implement refresh tokens
- Use HTTPS only

---

## Future Enhancements

1. **Persistent Database**
   - SQLite for development
   - PostgreSQL for production

2. **Enhanced Authentication**
   - OAuth integration
   - Multi-factor authentication
   - Password reset flow

3. **User Management**
   - Admin dashboard
   - User CRUD operations
   - Role-based access control

4. **Improved UX**
   - Remember me checkbox
   - Loading states
   - Better error messages

---

## Contact & Support

For issues or questions about the login flow:
1. Check the console for error messages
2. Verify backend health at http://localhost:3001/api/health
3. Review this documentation
4. Check server logs for detailed errors