// Route service for handling page routes and 404s
const path = require('path');
const fs = require('fs');

class RouteService {
  constructor() {
    // Define valid HTML routes
    this.validHtmlRoutes = [
      '/',
      '/dashboard',
      '/admin',
      '/login',
      '/signin',
      '/step2',
      '/completion',
      '/knowledge',
      '/users'
    ];
  }

  // Handle catch-all route - properly handle 404s
  handleCatchAll(req, res) {
    // Return 404 for API routes and static files
    if (req.path.startsWith('/api/') || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|json)$/)) {
      return res.status(404).send('Not found');
    }
    
    // Check if the path is a valid HTML route
    const requestedPath = req.path.replace(/\/$/, '') || '/'; // Normalize path
    if (this.validHtmlRoutes.includes(requestedPath)) {
      // Serve the appropriate page for valid routes
      const indexPath = path.join(__dirname, '../../index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.sendFile(path.join(__dirname, '../client/pages/dashboard.html'));
      }
    } else {
      // Return 404 for any non-existent route
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>404 - Page Not Found</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              font-size: 6rem;
              margin: 0;
              font-weight: bold;
            }
            h2 {
              font-size: 2rem;
              margin: 1rem 0;
              font-weight: normal;
            }
            p {
              font-size: 1.2rem;
              opacity: 0.9;
            }
            a {
              display: inline-block;
              margin-top: 2rem;
              padding: 0.75rem 2rem;
              background: white;
              color: #667eea;
              text-decoration: none;
              border-radius: 25px;
              font-weight: 600;
              transition: transform 0.2s;
            }
            a:hover {
              transform: scale(1.05);
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">Go to Home</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Get page route handlers
  getPageRoutes() {
    const __dirname = path.dirname(__filename);
    const baseDir = path.resolve(__dirname, '../..');
    
    return {
      '/': (req, res) => {
        res.sendFile(path.join(baseDir, 'index.html'));
      },
      '/dashboard': (req, res) => {
        res.sendFile(path.join(baseDir, 'src/client/pages/dashboard.html'));
      },
      '/knowledge': (req, res) => {
        res.sendFile(path.join(baseDir, 'src/client/pages/knowledge.html'));
      },
      '/users': (req, res) => {
        res.sendFile(path.join(baseDir, 'src/client/pages/users.html'));
      },
      '/admin': (req, res) => {
        res.sendFile(path.join(baseDir, 'src/client/pages/admin.html'));
      },
      '/step2': (req, res) => {
        res.sendFile(path.join(baseDir, 'src/client/pages/step2.html'));
      },
      '/completion': (req, res) => {
        res.sendFile(path.join(baseDir, 'src/client/pages/completion.html'));
      },
      '/signin': (req, res) => {
        res.sendFile(path.join(baseDir, 'signin.html'));
      }
    };
  }
}

module.exports = new RouteService();