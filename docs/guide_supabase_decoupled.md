## The Decoupled Architecture: An Overview

At a high level, your system will have three distinct parts that communicate securely.

1.  **The Frontend (Client):** Your web or mobile application. It will use the Supabase client library *only* to handle user sign-up and sign-in. For all other operations, it will talk to your backend.
2.  **The Backend (Your Application):** The brain of your operation. It contains your core business logic, connects to your primary database, and exposes a secure API. It will use the Supabase Admin library to verify users and manage storage permissions.
3.  **Supabase (The Service):** A managed service that you will use exclusively for User Authentication and File Storage.

This guide will use a **Node.js/Express** backend and a **React-style** frontend for its examples, but the principles are universal.

-----

## Part 1: Setting Up Your Supabase Project

First, we'll configure Supabase to act as our auth and storage engine.

### 1\. Create a Supabase Project

  * Go to the [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
  * Once it's ready, navigate to **Project Settings** \> **API**. You will need three keys. Store them securely in environment variables:
      * `SUPABASE_URL`: Your project's unique URL.
      * `SUPABASE_ANON_KEY`: The public-facing "anonymous" key for your frontend.
      * `SUPABASE_SERVICE_KEY`: The powerful "secret" key for your backend. **Never expose this key on the client side.**

### 2\. Configure Authentication

  * In the dashboard, go to **Authentication** \> **Providers**.
  * Enable **Email**. You can leave the default settings for now.
  * Enable a social provider like **Google**. You will need to create OAuth credentials in the Google Cloud Console and paste the Client ID and Secret here. Supabase provides a direct link and guide for this.

### 3\. Configure Storage and Security

We'll create a private bucket for user files and use PostgreSQL's Row Level Security (RLS) to define strict access rules.

1.  In the dashboard, go to **Storage** and click **"Create a new bucket"**.
2.  Name the bucket `user_uploads` and ensure the **"Public bucket"** toggle is **off**.
3.  Go to **Storage** \> **Policies**. You will see your new bucket. We need to add security policies to it. Click **"New Policy"** on the `storage.objects` table.

**Policy 1: Allow users to upload files.**
Use the "For CUD (create, update, delete) operations" template.

```sql
-- Allows authenticated users to insert into the 'user_uploads' bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user_uploads');
```

**Policy 2: Allow users to view their own files.**
Use the "Allow users to access their own files" template.

```sql
-- Allows users to view their own files in a folder matching their user_id
CREATE POLICY "Allow individual read access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
```

*Note: This policy assumes you will store files in folders named after the user's ID, which is a common and secure pattern (e.g., `user_uploads/USER_ID/profile.png`).*

-----

## Part 2: Building Your Backend Application

Now, we'll set up the server that contains your core logic and connects to your primary database.

### 1\. Database Schema (Your Primary DB)

In your own PostgreSQL database (not Supabase), create a table to mirror your users. The key is to use the Supabase User ID as the primary key.

```sql
-- In your main application database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- This will store the Supabase auth.users.id
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add any other app-specific fields you need
  subscription_status VARCHAR(50) DEFAULT 'free'
);
```

### 2\. The JIT Middleware (The Core of the System)

This middleware will run on every authenticated API route. It verifies the user's token and creates a local profile if one doesn't already exist.

```javascript
// backend/middleware/ensureUserProfile.js
import { createClient } from '@supabase/supabase-js';
import pool from '../db-config'; // Your primary DB connection

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const ensureUserProfile = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const jwt = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    let profileResult = await pool.query('SELECT * FROM profiles WHERE id = $1', [user.id]);

    if (profileResult.rowCount === 0) {
      console.log(`Profile for user ${user.id} not found. Creating it JIT...`);
      await pool.query(
        'INSERT INTO profiles (id, email) VALUES ($1, $2)',
        [user.id, user.email]
      );
      profileResult = await pool.query('SELECT * FROM profiles WHERE id = $1', [user.id]);
    }
    
    req.user = profileResult.rows[0]; // Attach user profile to the request
    next();
  } catch (dbError) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

### 3\. The Webhook Handler (For Real-time Sync)

The JIT middleware handles existing users perfectly. For new signups, a webhook is more immediate.

1.  **In Supabase:** Go to **Database** \> **Webhooks**. Enable webhooks and create a new one listening to `auth.users` on **"Insert"**. Set the URL to your backend endpoint (e.g., `https://yourapp.com/api/webhooks/user-created`). Copy the webhook secret.
2.  **In your backend:** create the endpoint.

<!-- end list -->

```javascript
// backend/routes/webhooks.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import pool from '../db-config';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

router.post('/user-created', express.json({ type: 'application/json' }), async (req, res) => {
  try {
    // It's highly recommended to verify the webhook signature for security
    // This is a simplified example
    const { record: user } = req.body;
    if (req.body.type === 'auth.user.created') {
        await pool.query(
          'INSERT INTO profiles (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
          [user.id, user.email]
        );
        console.log(`Webhook processed for new user: ${user.id}`);
    }
    res.status(200).send('Success');
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
```

### 4\. Securely Generating an Upload URL

The client should **never** decide where to upload a file. It must ask the backend for permission. Your backend will then ask Supabase for a temporary, secure URL.

```javascript
// backend/routes/files.js
import express from 'express';
import { ensureUserProfile } from '../middleware/ensureUserProfile';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// This route is protected by our middleware
router.post('/generate-upload-url', ensureUserProfile, async (req, res) => {
  const { fileName, fileType } = req.body;
  const userId = req.user.id; // We get this securely from the middleware

  // Create a secure path for the file using the user's ID
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('user_uploads')
    .createSignedUploadUrl(filePath);

  if (error) {
    return res.status(500).json({ error: 'Could not create upload URL' });
  }

  res.json({ signedUrl: data.signedUrl, path: data.path });
});

export default router;
```

-----

## Part 3: Frontend Integration

Finally, let's tie it all together on the client side.

### 1\. Initialize Supabase and Your API Client

```javascript
// frontend/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// You would also have an API client like Axios configured
// to talk to your backend.
```

### 2\. Handle Authentication

```jsx
// frontend/components/Auth.jsx
function Auth() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleEmailLogin = async (email, password) => {
    await supabase.auth.signInWithPassword({ email, password });
  };

  // After login, Supabase automatically handles the session.
  // We need to get the JWT to talk to our backend.
}
```

### 3\. The Complete File Upload Flow

This is the key interaction between the three parts of your system.

```jsx
// frontend/components/Uploader.jsx
import axios from 'axios'; // Your API client
import { supabase } from '../lib/supabaseClient';

function FileUploader() {
  const handleFileUpload = async (file) => {
    // Step 1: Get the session JWT from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User is not authenticated');
    }
    const token = session.access_token;

    // Step 2: Ask our backend for a secure upload URL
    const { data: uploadData } = await axios.post(
      'http://localhost:4000/api/files/generate-upload-url',
      { fileName: file.name, fileType: file.type },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { signedUrl } = uploadData;

    // Step 3: Upload the file directly to Supabase Storage using the signed URL
    const { error } = await supabase.storage
        .from('user_uploads')
        .uploadToSignedUrl(signedUrl, file);
    
    if (error) {
        console.error('Upload failed:', error);
    } else {
        console.log('Upload successful!');
        // You can now save the file path (uploadData.path) to your primary DB
    }
  };
  
  // ... JSX for the file input
}
```

-----

## Conclusion: A Flexible and Future-Proof System

You have now built a system where:

  * **Authentication** is handled by a specialized, secure service.
  * **File Storage** is managed with fine-grained, database-level security policies.
  * **Your Application** holds all the core logic and is not tightly coupled to Supabase.

This architecture is powerful because if you ever decide to move away from Supabase, the migration path is clear. You would simply change the engine inside your `ensureUserProfile` middleware and update the file upload logic to point to a new provider. Your primary database schema and your core application logic would remain untouched.
