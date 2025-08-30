# Manual Test for Knowledge Management Page

## Test Objectives
Validate that the Knowledge Management page is accessible from the dashboard and contains all expected components.

## Prerequisites
- Docker containers running (`docker compose ps` shows healthy status)
- Application accessible at http://localhost:5000

## Test Steps

### 1. Login as Admin
1. Navigate to http://localhost:5000/login
2. Enter credentials:
   - Email: `admin@resolve.io`
   - Password: `admin123`
3. Click "Sign In"
4. **Expected:** Should redirect to dashboard at http://localhost:5000/dashboard

### 2. Locate Knowledge Base Widget
1. On the dashboard, look for the "Knowledge Base" widget in the right sidebar
2. **Expected:** Widget should display:
   - Title: "Knowledge Base"
   - Upload area with text "Drop files or click to upload"
   - Stats showing Articles, Vectors, and Accuracy
   - "Manage Knowledge Base →" button at the bottom

### 3. Navigate to Knowledge Management Page
1. Click the "Manage Knowledge Base →" button
2. **Expected:** Should navigate to http://localhost:5000/knowledge

### 4. Verify Knowledge Page Components
Check for the following components on the Knowledge page:

#### Header Section
- [ ] Page title: "Knowledge Base Management"
- [ ] "Upload Documents" button with upload icon (blue gradient)

#### Stats Bar
- [ ] 5 stat cards showing:
  - Total Documents (11)
  - Total Vectors (350)
  - Storage Used (15.8 MB)
  - Avg. Accuracy (89%)
  - Queries Answered (1,247)

#### Toolbar
- [ ] Search input with placeholder "Search documents..."
- [ ] Status filter dropdown (All Status/Ready/Processing/Error)
- [ ] Type filter dropdown (All Types/PDF/DOCX/TXT/Markdown)
- [ ] View toggle buttons (Grid/List)

#### Data Table
- [ ] Table headers: Document Name, Type, Status, Chunks, Size, Queries, Accuracy, Last Modified, Actions
- [ ] 11 sample document rows
- [ ] Checkboxes for row selection
- [ ] Action buttons per row (View/Download/Reprocess/Delete)

#### Footer
- [ ] Pagination controls
- [ ] Text showing "Showing 1-8 of 11 documents"

### 5. Test Interactivity
1. **Search:** Type "Employee" in search box
   - **Expected:** Table should filter to show only matching documents
   
2. **Sort:** Click on any column header (e.g., "Document Name")
   - **Expected:** Sort icon should change and rows should reorder
   
3. **Select:** Check a checkbox next to any document
   - **Expected:** Bulk actions bar should appear with "X selected" text
   
4. **Filter:** Change Status dropdown to "Ready"
   - **Expected:** Table should only show documents with "Ready" status

### 6. Test Navigation Back
1. Click "Dashboard" button in the header
2. **Expected:** Should return to dashboard at http://localhost:5000/dashboard

### 7. Test Direct Access
1. While logged in, navigate directly to http://localhost:5000/knowledge
2. **Expected:** Should load the Knowledge Management page directly

### 8. Test Authentication Requirement
1. Open a new incognito/private browser window
2. Navigate to http://localhost:5000/knowledge
3. **Expected:** Should redirect to login page at http://localhost:5000/login

## Test Results

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Admin login | | |
| Knowledge widget visible | | |
| Navigation to /knowledge | | |
| Page components render | | |
| Search functionality | | |
| Sort functionality | | |
| Row selection | | |
| Filter functionality | | |
| Navigation back to dashboard | | |
| Direct URL access | | |
| Authentication requirement | | |

## Issues Found
(Document any issues or unexpected behavior here)

## Screenshots
(Attach screenshots of the Knowledge Management page if needed)