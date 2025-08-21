# Resolve Onboarding - Project Structure

## Directory Layout

```
resolve-onboarding/
│
├── src/                        # Source code
│   ├── server/                 # Server-side code
│   │   └── demo-journey.js    # Demo journey script
│   │
│   ├── client/                 # Client-side code
│   │   ├── pages/             # HTML pages
│   │   │   ├── dashboard.html # Main dashboard
│   │   │   ├── login.html     # Login page
│   │   │   ├── step2.html     # Onboarding step 2
│   │   │   ├── completion.html# Onboarding completion
│   │   │   └── jarvis.html    # Jarvis AI interface
│   │   │
│   │   ├── styles/            # CSS stylesheets
│   │   │   ├── base.css       # Base styles
│   │   │   ├── main.css       # Main application styles
│   │   │   ├── fonts.css      # Font definitions
│   │   │   ├── dashboard-styles.css # Dashboard specific styles
│   │   │   ├── step2-styles.css     # Step 2 page styles
│   │   │   ├── completion-styles.css# Completion page styles
│   │   │   ├── animations.css       # Animation definitions
│   │   │   ├── components.css       # Component styles
│   │   │   ├── file-upload.css      # File upload styles
│   │   │   └── resolve-theme.css    # Resolve brand theme
│   │   │
│   │   └── components/        # JavaScript components
│   │       ├── base-layout.js # Base layout component
│   │       ├── form-components.js   # Form components
│   │       ├── integration-form.js  # Integration form
│   │       ├── loading-progress.js  # Loading/progress indicators
│   │       └── resolve-integration.js # Resolve integration logic
│   │
│   └── database/              # Database files
│       ├── init.sql           # Database initialization
│       ├── migrations.js      # Database migrations
│       └── postgres.js        # PostgreSQL connection
│
├── public/                     # Public static assets
│   ├── fonts/                 # Font files
│   │   ├── SeasonMix-*.otf   # SeasonMix font family
│   │   └── SeasonSans-*.otf  # SeasonSans font family
│   │
│   ├── images/                # Image assets
│   │   └── logo.svg           # Resolve logo
│   │
│   └── robots.txt             # Robots configuration
│
├── config/                     # Configuration files
│   ├── playwright.config.js   # Playwright test configuration
│   ├── playwright.config.testcontainers.js # Test containers config
│   ├── docker-compose.yml     # Docker compose for production
│   ├── docker-compose.test.yml# Docker compose for testing
│   └── Dockerfile             # Docker image definition
│
├── tests/                      # Test files
│   ├── dashboard.spec.js      # Dashboard tests
│   ├── onboarding-journey.spec.js # E2E onboarding journey test
│   ├── global-setup.js        # Test setup
│   └── global-teardown.js     # Test teardown
│
├── scripts/                    # Utility scripts
│   └── show-journey.sh        # Journey display script
│
├── docs/                       # Documentation
│   ├── CSS_EXTRACTION_REPORT.md    # CSS extraction documentation
│   └── CSS_UPDATES_SUMMARY.md      # CSS updates summary
│
├── uploads/                    # File upload directory
├── data/                       # Data storage directory
│
├── server.js                   # Main server entry point (root for Docker)
├── index.html                  # Main HTML entry point
├── package.json                # Node.js dependencies
├── package-lock.json          # Locked dependencies
├── Dockerfile                 # Docker configuration (root for Docker)
├── docker-compose.yml         # Docker Compose (root for Docker)
├── playwright.config.js       # Playwright config (root for tests)
└── README.md                  # Project documentation
```

## Key Design Decisions

### File Organization
- **src/**: All source code organized by concern (server, client, database)
- **public/**: Static assets served directly
- **config/**: All configuration files in one place
- **tests/**: All test files together
- **docs/**: Documentation files

### Root Files
Certain files remain in the root for compatibility:
- `server.js`: Main entry point (Docker expects this in root)
- `index.html`: Main HTML file
- `package.json`: Node.js project file
- `Dockerfile` & `docker-compose.yml`: Docker files (convention)
- `README.md`: Standard location for project docs

### Path Structure
- All paths in HTML files use absolute paths (e.g., `/styles/`, `/components/`)
- Server properly maps these to the organized directories
- Static assets served from `/public`

## Running the Application

### Local Development
```bash
npm install
npm run dev
# Visit http://localhost:8080
```

### Docker
```bash
docker-compose up --build
# Visit http://localhost:8082
```

### Testing
```bash
npm test
# or for test containers:
npx playwright test --config=playwright.config.testcontainers.js
```

## Environment Variables
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment (development/production/test)
- `DATABASE_TYPE`: Database type (sqlite/postgres)
- `DATABASE_PATH`: Path to SQLite database
- `DATABASE_URL`: PostgreSQL connection string