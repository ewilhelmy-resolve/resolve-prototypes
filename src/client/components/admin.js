// Admin Dashboard JavaScript
const ADMIN_EMAIL = 'john.gorham@resolve.io';

// Store chart instances globally to prevent memory leaks
let chartInstances = {
    trendsChart: null,
    typeChart: null,
    actionChart: null,
    successFailChart: null,
    hourlyChart: null,
    weeklyChart: null
};

// Check admin authentication
async function checkAdminAuth() {
    // Server already checked admin access if we're here
    // Just try to get the user email from localStorage or session
    let userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        // Try to get from userSession
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
            try {
                const session = JSON.parse(userSession);
                userEmail = session.email;
            } catch (e) {
                console.error('Failed to parse user session:', e);
            }
        }
    }
    
    // If still no email, use default admin email
    if (!userEmail) {
        userEmail = 'john.gorham@resolve.io';
    }
    
    // Verify we can access admin API
    try {
        const response = await fetch('/api/admin/stats', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Admin API access denied');
            alert('Session expired. Please login again.');
            window.location.href = '/signin';
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Unable to verify admin access. Please login again.');
        window.location.href = '/signin';
        return false;
    }
    
    document.getElementById('adminEmail').textContent = userEmail;
    return true;
}

// System Settings Functions
async function loadSystemSettings() {
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load settings');
        }
        
        const settings = await response.json();
        
        // Populate form fields
        Object.keys(settings).forEach(key => {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = settings[key];
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

async function saveSystemSettings(formData) {
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(Object.fromEntries(formData))
        });
        
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        
        showNotification('Settings saved successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
        return false;
    }
}

async function testCallbackUrl() {
    const testButton = document.getElementById('testCallbackUrl');
    const resultDiv = document.getElementById('testResult');
    
    testButton.disabled = true;
    resultDiv.className = 'test-result testing';
    resultDiv.textContent = 'Testing connection...';
    
    try {
        const response = await fetch('/api/admin/test-callback', {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            resultDiv.className = 'test-result success';
            resultDiv.textContent = `✓ Callback URL is accessible: ${result.url}`;
        } else {
            resultDiv.className = 'test-result error';
            resultDiv.textContent = `✗ Callback URL is not accessible: ${result.error}`;
        }
    } catch (error) {
        resultDiv.className = 'test-result error';
        resultDiv.textContent = `✗ Test failed: ${error.message}`;
    } finally {
        testButton.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Webhook Traffic Functions
let trafficCurrentPage = 1;
const trafficLimit = 50;

async function loadWebhookTrafficData() {
    const category = document.getElementById('trafficCategoryFilter')?.value || 'all';
    const method = document.getElementById('trafficMethodFilter')?.value || 'all';
    const status = document.getElementById('trafficStatusFilter')?.value || '';
    const failedOnly = document.getElementById('webhooksOnlyFilter')?.checked || false;
    const search = document.getElementById('trafficSearchInput')?.value || '';
    
    const offset = (trafficCurrentPage - 1) * trafficLimit;
    
    try {
        const params = new URLSearchParams({
            limit: trafficLimit,
            offset: offset,
            ...(category !== 'all' && { category }),
            ...(method !== 'all' && { method }),
            ...(status && { status }),
            ...(failedOnly && { status: '400' }), // Show only 400+ errors
            ...(search && { search }),
            is_webhook: 'true' // Always filter for webhook/callback traffic
        });
        
        const response = await fetch(`/api/admin/webhook-traffic?${params}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load traffic data');
        
        const data = await response.json();
        
        // Update stats
        document.getElementById('totalTrafficCount').textContent = `Total Callbacks: ${data.total}`;
        const successCount = data.traffic.filter(t => t.response_status < 400).length;
        document.getElementById('webhookTrafficCount').textContent = `Successful: ${successCount}`;
        const failedCount = data.traffic.filter(t => t.response_status >= 400).length;
        document.getElementById('failedTrafficCount').textContent = `Failed: ${failedCount}`;
        
        // Update table
        const tbody = document.getElementById('trafficTableBody');
        tbody.innerHTML = '';
        
        data.traffic.forEach(log => {
            const row = tbody.insertRow();
            const time = new Date(log.captured_at).toLocaleString();
            const statusClass = log.response_status >= 400 ? 'status-error' : 
                               log.response_status >= 300 ? 'status-warning' : 'status-success';
            
            row.innerHTML = `
                <td>${time}</td>
                <td><span class="method-${log.request_method.toLowerCase()}">${log.request_method}</span></td>
                <td class="url-cell" title="${escapeHtml(log.request_url)}">${escapeHtml(log.request_url)}</td>
                <td><span class="category-badge">${log.endpoint_category}</span></td>
                <td><span class="${statusClass}">${log.response_status || 'N/A'}</span></td>
                <td>${log.source_ip || 'N/A'}</td>
                <td>
                    <button class="btn-detail" onclick="viewTrafficDetail(${log.id})">View</button>
                </td>
            `;
        });
        
        // Update pagination
        const totalPages = Math.ceil(data.total / trafficLimit);
        document.getElementById('trafficPageInfo').textContent = `Page ${trafficCurrentPage} of ${totalPages}`;
        document.getElementById('trafficPrevPage').disabled = trafficCurrentPage === 1;
        document.getElementById('trafficNextPage').disabled = trafficCurrentPage >= totalPages;
        
    } catch (error) {
        console.error('Error loading traffic data:', error);
        showNotification('Failed to load traffic data', 'error');
    }
}

async function viewTrafficDetail(id) {
    try {
        const response = await fetch(`/api/admin/webhook-traffic/${id}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load traffic detail');
        
        const log = await response.json();
        
        const modal = document.getElementById('trafficDetailModal');
        const content = document.getElementById('trafficModalContent');
        
        // Format JSON with proper indentation
        const formatJson = (obj) => {
            try {
                return JSON.stringify(obj, null, 2);
            } catch {
                return obj;
            }
        };
        
        content.innerHTML = `
            <div class="traffic-detail">
                <div class="detail-section">
                    <h4>Request Information</h4>
                    <p><strong>Time:</strong> ${new Date(log.captured_at).toLocaleString()}</p>
                    <p><strong>Method:</strong> ${log.request_method}</p>
                    <p><strong>URL:</strong> ${escapeHtml(log.request_url)}</p>
                    <p><strong>Category:</strong> ${log.endpoint_category}</p>
                    <p><strong>Is Webhook:</strong> ${log.is_webhook ? 'Yes' : 'No'}</p>
                    <p><strong>Source IP:</strong> ${log.source_ip || 'N/A'}</p>
                    <p><strong>User Agent:</strong> ${escapeHtml(log.user_agent || 'N/A')}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Request Headers</h4>
                    <pre>${escapeHtml(formatJson(log.request_headers))}</pre>
                </div>
                
                <div class="detail-section">
                    <h4>Request Body</h4>
                    <pre>${escapeHtml(log.request_body || 'No body')}</pre>
                </div>
                
                <div class="detail-section">
                    <h4>Query Parameters</h4>
                    <pre>${escapeHtml(formatJson(log.request_query || {}))}</pre>
                </div>
                
                <div class="detail-section">
                    <h4>Response</h4>
                    <p><strong>Status:</strong> ${log.response_status || 'N/A'}</p>
                    <pre>${escapeHtml(log.response_body || 'No response body')}</pre>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading traffic detail:', error);
        showNotification('Failed to load traffic detail', 'error');
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text?.toString().replace(/[&<>"']/g, m => map[m]) || '';
}

// Make viewTrafficDetail globally accessible
window.viewTrafficDetail = viewTrafficDetail;

function setupWebhookTrafficHandlers() {
    // Filter changes
    const filters = ['trafficCategoryFilter', 'trafficMethodFilter', 'trafficStatusFilter', 'webhooksOnlyFilter'];
    filters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                trafficCurrentPage = 1;
                loadWebhookTrafficData();
            });
        }
    });
    
    // Search
    const searchBtn = document.getElementById('searchTrafficBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            trafficCurrentPage = 1;
            loadWebhookTrafficData();
        });
    }
    
    const searchInput = document.getElementById('trafficSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                trafficCurrentPage = 1;
                loadWebhookTrafficData();
            }
        });
    }
    
    // Refresh
    const refreshBtn = document.getElementById('refreshTrafficBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadWebhookTrafficData);
    }
    
    // Clear old logs
    const clearBtn = document.getElementById('clearOldTrafficBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (confirm('Clear all traffic logs older than 1 day?')) {
                try {
                    const response = await fetch('/api/admin/webhook-traffic/clear', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ older_than_days: 1 })
                    });
                    
                    const result = await response.json();
                    showNotification(result.message || 'Logs cleared', 'success');
                    loadWebhookTrafficData();
                } catch (error) {
                    showNotification('Failed to clear logs', 'error');
                }
            }
        });
    }
    
    // Pagination
    const prevBtn = document.getElementById('trafficPrevPage');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (trafficCurrentPage > 1) {
                trafficCurrentPage--;
                loadWebhookTrafficData();
            }
        });
    }
    
    const nextBtn = document.getElementById('trafficNextPage');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            trafficCurrentPage++;
            loadWebhookTrafficData();
        });
    }
    
    // Modal close
    const closeModal = document.querySelector('.close-traffic-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('trafficDetailModal').style.display = 'none';
        });
    }
    
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('trafficDetailModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialize dashboard
async function initDashboard() {
    // Skip client-side auth check - server already validated
    // Just set the email display
    let userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
            try {
                const session = JSON.parse(userSession);
                userEmail = session.email;
            } catch (e) {
                userEmail = 'john.gorham@resolve.io';
            }
        } else {
            userEmail = 'john.gorham@resolve.io';
        }
    }
    
    const emailElement = document.getElementById('adminEmail');
    if (emailElement) {
        emailElement.textContent = userEmail;
    }
    
    // Set up navigation
    setupNavigation();
    
    // Load initial data
    await loadOverviewData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Setup webhook traffic handlers
    setupWebhookTrafficHandlers();
    
    // Setup settings form handlers
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(settingsForm);
            await saveSystemSettings(formData);
        });
    }
    
    const resetButton = document.getElementById('resetSettings');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (confirm('Reset all settings to default values?')) {
                await fetch('/api/admin/settings/reset', {
                    method: 'POST',
                    credentials: 'include'
                });
                await loadSystemSettings();
                showNotification('Settings reset to defaults', 'info');
            }
        });
    }
    
    const testButton = document.getElementById('testCallbackUrl');
    if (testButton) {
        testButton.addEventListener('click', testCallbackUrl);
    }
    
    // Start auto-refresh
    // Temporarily disabled to fix chart rendering issue
    // setInterval(refreshData, 30000); // Refresh every 30 seconds
}

// Navigation setup
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.admin-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // Load section data
            loadSectionData(targetId);
        });
    });
}

// Event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/signin';
    });
    
    // User Management Events
    const searchUsersBtn = document.getElementById('searchUsersBtn');
    if (searchUsersBtn) {
        searchUsersBtn.addEventListener('click', loadUserManagementData);
    }
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            document.getElementById('userSearchInput').value = '';
            loadUserManagementData();
        });
    }
    
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', loadUserManagementData);
    }
    
    const tierFilter = document.getElementById('tierFilter');
    if (tierFilter) {
        tierFilter.addEventListener('change', loadUserManagementData);
    }
    
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', loadUserManagementData);
    }
    
    const sortOrder = document.getElementById('sortOrder');
    if (sortOrder) {
        sortOrder.addEventListener('change', loadUserManagementData);
    }
    
    // Edit User Modal
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
    
    const cancelEdit = document.getElementById('cancelEdit');
    if (cancelEdit) {
        cancelEdit.addEventListener('click', closeEditModal);
    }
    
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditModal);
    }
    
    // Refresh triggers
    const refreshTriggers = document.getElementById('refreshTriggers');
    if (refreshTriggers) {
        refreshTriggers.addEventListener('click', loadTriggersData);
    }
    
    // User search
    const searchUser = document.getElementById('searchUser');
    if (searchUser) {
        searchUser.addEventListener('click', searchUserActivity);
    }
    
    // Date range
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('change', loadAnalyticsData);
    }
    
    // Filters
    const triggerTypeFilter = document.getElementById('triggerTypeFilter');
    if (triggerTypeFilter) {
        triggerTypeFilter.addEventListener('change', filterTriggers);
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterTriggers);
    }
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', filterTriggers);
    }
    
    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
}

// Load overview data
async function loadOverviewData() {
    try {
        const response = await fetch('/api/admin/stats', {
            credentials: 'include' // Use cookies for auth
        });
        
        if (!response.ok) {
            console.error('Failed to load stats:', response.status);
            // Don't show alerts, just log the error
            return;
        }
        
        const data = await response.json();
        
        // Update stats cards
        updateStatsCards(data.stats);
        
        // Update charts
        updateTrendsChart(data.dailyTrends);
        updateTypeChart(data.triggersByType);
        
        // Update top users table
        updateTopUsersTable(data.topUsers);
        
    } catch (error) {
        console.error('Error loading overview data:', error);
        // Don't show alerts, just log the error
    }
}

// Update stats cards
function updateStatsCards(stats) {
    if (!stats) return;
    
    document.getElementById('totalTriggers').textContent = stats.total_triggers || 0;
    document.getElementById('uniqueUsers').textContent = stats.unique_users || 0;
    document.getElementById('successRate').textContent = `${stats.success_rate || 0}%`;
    
    // Calculate today's triggers (would need separate API call for real-time)
    document.getElementById('todayTriggers').textContent = stats.today_triggers || 0;
    
    // Update change indicators
    updateChangeIndicator('triggersChange', '+12%', true);
    updateChangeIndicator('usersChange', '+5%', true);
    updateChangeIndicator('successChange', '+2%', true);
    updateChangeIndicator('todayChange', '+25%', true);
}

// Update change indicator
function updateChangeIndicator(elementId, value, isPositive) {
    const element = document.getElementById(elementId);
    element.textContent = value;
    element.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
}

// Update trends chart
function updateTrendsChart(trendsData) {
    // Get the existing canvas element
    let canvas = document.getElementById('trendsChart');
    if (!canvas) return;
    
    // Get parent container before destroying
    const container = canvas.parentElement;
    if (!container) return;
    
    // Destroy existing chart if it exists
    if (chartInstances.trendsChart) {
        chartInstances.trendsChart.destroy();
        chartInstances.trendsChart = null;
    }
    
    // Remove old canvas and create new one to reset dimensions
    canvas.remove();
    canvas = document.createElement('canvas');
    canvas.id = 'trendsChart';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Default empty data if none provided
    const labels = trendsData && trendsData.length > 0 
        ? trendsData.map(d => formatDate(d.date)) 
        : ['No Data'];
    
    const triggersData = trendsData && trendsData.length > 0
        ? trendsData.map(d => parseInt(d.triggers) || 0)
        : [0];
    
    const successfulData = trendsData && trendsData.length > 0
        ? trendsData.map(d => parseInt(d.successful) || 0)
        : [0];
    
    // Create new chart
    chartInstances.trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Triggers',
                data: triggersData,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.3
            }, {
                label: 'Successful',
                data: successfulData,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#9CA3AF'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                }
            }
        }
    });
}

// Update type chart
function updateTypeChart(typeData) {
    // Get the existing canvas element
    let canvas = document.getElementById('typeChart');
    if (!canvas) return;
    
    // Get parent container before destroying
    const container = canvas.parentElement;
    if (!container) return;
    
    // Destroy existing chart if it exists
    if (chartInstances.typeChart) {
        chartInstances.typeChart.destroy();
        chartInstances.typeChart = null;
    }
    
    // Remove old canvas and create new one to reset dimensions
    canvas.remove();
    canvas = document.createElement('canvas');
    canvas.id = 'typeChart';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Default empty data if none provided
    const chartLabels = typeData && typeData.length > 0
        ? typeData.map(d => d.trigger_type || 'Unknown')
        : ['No Data'];
    
    const chartData = typeData && typeData.length > 0
        ? typeData.map(d => parseInt(d.count) || 0)
        : [0];
    
    // Create new chart
    chartInstances.typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: [
                    '#6366F1',
                    '#8B5CF6',
                    '#EC4899',
                    '#F59E0B',
                    '#10B981'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9CA3AF'
                    }
                }
            }
        }
    });
}

// Update top users table
function updateTopUsersTable(users) {
    const tbody = document.getElementById('topUsersTable');
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty-state">
                    <p class="table-empty-subtitle">No user data available</p>
                </td>
            </tr>`;
        return;
    }
    
    users.forEach(user => {
        const successRate = user.trigger_count > 0 
            ? ((user.successful / user.trigger_count) * 100).toFixed(1) 
            : 0;
        
        tbody.innerHTML += `
            <tr class="table-tr">
                <td class="table-td table-td-primary">
                    <span class="table-link">${user.user_email}</span>
                </td>
                <td class="table-td">${user.trigger_count}</td>
                <td class="table-td">
                    <span class="table-status-badge ${successRate >= 80 ? 'table-status-ready' : successRate >= 50 ? 'table-status-text' : 'table-status-error'}">
                        ${successRate}%
                    </span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${formatDateTime(user.last_activity)}</span>
                </td>
            </tr>
        `;
    });
}

// Load section data
async function loadSectionData(section) {
    switch(section) {
        case 'user-management':
            await loadUserManagementData();
            break;
        case 'triggers':
            await loadTriggersData();
            break;
        case 'analytics':
            await loadAnalyticsData();
            break;
        case 'webhooks':
            await loadWebhooksData();
            break;
        case 'webhook-traffic':
            await loadWebhookTrafficData();
            break;
        case 'settings':
            await loadSystemSettings();
            break;
        case 'logs':
            await loadSystemLogs();
            break;
    }
}

// Load triggers data
async function loadTriggersData() {
    try {
        const response = await fetch('/api/admin/triggers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load triggers');
        
        const triggers = await response.json();
        updateTriggersTable(triggers);
        
    } catch (error) {
        console.error('Error loading triggers:', error);
    }
}

// Update triggers table
function updateTriggersTable(triggers) {
    const tbody = document.getElementById('triggersTable');
    tbody.innerHTML = '';
    
    if (!triggers || triggers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No triggers found</td></tr>';
        return;
    }
    
    triggers.forEach(trigger => {
        const statusBadge = trigger.success 
            ? '<span class="status-badge success">Success</span>'
            : '<span class="status-badge failed">Failed</span>';
        
        tbody.innerHTML += `
            <tr>
                <td>${formatDateTime(trigger.triggered_at)}</td>
                <td>${trigger.user_email}</td>
                <td>${trigger.trigger_type}</td>
                <td>${trigger.action}</td>
                <td>${statusBadge}</td>
                <td>${trigger.response_status || '-'}</td>
                <td>
                    <button class="btn-detail" onclick="showTriggerDetail('${trigger.id}')">
                        View
                    </button>
                </td>
            </tr>
        `;
    });
}

// Filter triggers
function filterTriggers() {
    const type = document.getElementById('triggerTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    const date = document.getElementById('dateFilter').value;
    
    // Apply filters to table rows
    const rows = document.querySelectorAll('#triggersTable tr');
    rows.forEach(row => {
        let show = true;
        
        // Filter logic here
        // This would be better done server-side with query params
        
        row.style.display = show ? '' : 'none';
    });
}

// Search user activity
async function searchUserActivity() {
    const email = document.getElementById('userEmailSearch').value;
    if (!email) return;
    
    try {
        const response = await fetch(`/api/admin/user-activity?email=${encodeURIComponent(email)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load user activity');
        
        const activity = await response.json();
        displayUserActivity(activity);
        
    } catch (error) {
        console.error('Error loading user activity:', error);
    }
}

// Display user activity
function displayUserActivity(activity) {
    const content = document.getElementById('userActivityContent');
    
    if (!activity || activity.length === 0) {
        content.innerHTML = '<p>No activity found for this user</p>';
        return;
    }
    
    let html = `
        <h3>Activity for ${activity[0].user_email}</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    activity.forEach(item => {
        html += `
            <tr>
                <td>${formatDateTime(item.triggered_at)}</td>
                <td>${item.trigger_type}</td>
                <td>${item.action}</td>
                <td>
                    ${item.success 
                        ? '<span class="status-badge success">Success</span>'
                        : '<span class="status-badge failed">Failed</span>'}
                </td>
                <td>
                    <button class="btn-detail" onclick="showTriggerDetail('${item.id}')">
                        View
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    content.innerHTML = html;
}

// Load analytics data
async function loadAnalyticsData() {
    const dateRange = document.getElementById('dateRange').value;
    
    try {
        const response = await fetch(`/api/admin/analytics?days=${dateRange}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load analytics');
        
        const data = await response.json();
        updateAnalyticsCharts(data);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Update analytics charts
function updateAnalyticsCharts(data) {
    // Update action chart
    if (data.triggersByAction) {
        updateActionChart(data.triggersByAction);
    }
    
    // Update success/fail chart
    if (data.successFailTrends) {
        updateSuccessFailChart(data.successFailTrends);
    }
    
    // Update hourly chart
    if (data.hourlyDistribution) {
        updateHourlyChart(data.hourlyDistribution);
    }
    
    // Update weekly chart
    if (data.weeklyPattern) {
        updateWeeklyChart(data.weeklyPattern);
    }
}

// Update success/fail trends chart
function updateSuccessFailChart(trendData) {
    // Get the existing canvas element
    let canvas = document.getElementById('successFailChart');
    if (!canvas) return;
    
    // Get parent container before destroying
    const container = canvas.parentElement;
    if (!container) return;
    
    // Destroy existing chart if it exists
    if (chartInstances.successFailChart) {
        chartInstances.successFailChart.destroy();
        chartInstances.successFailChart = null;
    }
    
    // Remove old canvas and create new one to reset dimensions
    canvas.remove();
    canvas = document.createElement('canvas');
    canvas.id = 'successFailChart';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Default empty data if none provided
    if (!trendData || trendData.length === 0) {
        trendData = [{ date: new Date().toISOString(), success: 0, failed: 0 }];
    }
    
    // Create new chart
    chartInstances.successFailChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(d => formatDate(d.date)),
            datasets: [{
                label: 'Successful',
                data: trendData.map(d => d.success || 0),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3
            }, {
                label: 'Failed',
                data: trendData.map(d => d.failed || 0),
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#9CA3AF'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                }
            }
        }
    });
}

// Update hourly distribution chart
function updateHourlyChart(hourlyData) {
    // Get the existing canvas element
    let canvas = document.getElementById('hourlyChart');
    if (!canvas) return;
    
    // Get parent container before destroying
    const container = canvas.parentElement;
    if (!container) return;
    
    // Destroy existing chart if it exists
    if (chartInstances.hourlyChart) {
        chartInstances.hourlyChart.destroy();
        chartInstances.hourlyChart = null;
    }
    
    // Remove old canvas and create new one to reset dimensions
    canvas.remove();
    canvas = document.createElement('canvas');
    canvas.id = 'hourlyChart';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Default empty data if none provided
    if (!hourlyData || hourlyData.length === 0) {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push({ hour: i, count: 0 });
        }
        hourlyData = hours;
    }
    
    // Create new chart
    chartInstances.hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyData.map(d => `${d.hour}:00`),
            datasets: [{
                label: 'Triggers',
                data: hourlyData.map(d => d.count || 0),
                backgroundColor: '#6366F1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                }
            }
        }
    });
}

// Update weekly pattern chart
function updateWeeklyChart(weeklyData) {
    // Get the existing canvas element
    let canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    // Get parent container before destroying
    const container = canvas.parentElement;
    if (!container) return;
    
    // Destroy existing chart if it exists
    if (chartInstances.weeklyChart) {
        chartInstances.weeklyChart.destroy();
        chartInstances.weeklyChart = null;
    }
    
    // Remove old canvas and create new one to reset dimensions
    canvas.remove();
    canvas = document.createElement('canvas');
    canvas.id = 'weeklyChart';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Default empty data if none provided
    if (!weeklyData || weeklyData.length === 0) {
        weeklyData = [
            { day: 'Monday', count: 0 },
            { day: 'Tuesday', count: 0 },
            { day: 'Wednesday', count: 0 },
            { day: 'Thursday', count: 0 },
            { day: 'Friday', count: 0 },
            { day: 'Saturday', count: 0 },
            { day: 'Sunday', count: 0 }
        ];
    }
    
    // Create new chart
    chartInstances.weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeklyData.map(d => d.day),
            datasets: [{
                label: 'Triggers',
                data: weeklyData.map(d => d.count || 0),
                backgroundColor: '#8B5CF6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                }
            }
        }
    });
}

// Update action chart
function updateActionChart(actionData) {
    // Get the existing canvas element
    let canvas = document.getElementById('actionChart');
    if (!canvas) return;
    
    // Get parent container before destroying
    const container = canvas.parentElement;
    if (!container) return;
    
    // Destroy existing chart if it exists
    if (chartInstances.actionChart) {
        chartInstances.actionChart.destroy();
        chartInstances.actionChart = null;
    }
    
    // Remove old canvas and create new one to reset dimensions
    canvas.remove();
    canvas = document.createElement('canvas');
    canvas.id = 'actionChart';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Default empty data if none provided
    if (!actionData || actionData.length === 0) {
        actionData = [{ action: 'No Data', count: 0, successful: 0 }];
    }
    
    // Create new chart
    chartInstances.actionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: actionData.map(d => d.action),
            datasets: [{
                label: 'Total Triggers',
                data: actionData.map(d => d.count),
                backgroundColor: '#6366F1'
            }, {
                label: 'Successful',
                data: actionData.map(d => d.successful),
                backgroundColor: '#10B981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#9CA3AF'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151'
                    }
                }
            }
        }
    });
}

// Load webhooks data
async function loadWebhooksData() {
    try {
        const response = await fetch('/api/admin/webhooks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load webhooks');
        
        const webhooks = await response.json();
        updateWebhooksTable(webhooks);
        
    } catch (error) {
        console.error('Error loading webhooks:', error);
    }
}

// Update webhooks table
function updateWebhooksTable(webhooks) {
    const tbody = document.getElementById('webhooksTable');
    tbody.innerHTML = '';
    
    if (!webhooks || webhooks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty-state">
                    <p class="table-empty-subtitle">No webhook calls found</p>
                </td>
            </tr>`;
        return;
    }
    
    webhooks.forEach(webhook => {
        tbody.innerHTML += `
            <tr class="table-tr">
                <td class="table-td">
                    <span class="table-text-secondary">${formatDateTime(webhook.called_at)}</span>
                </td>
                <td class="table-td table-td-primary">
                    <span class="table-link">${webhook.user_email}</span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${webhook.filename || '-'}</span>
                </td>
                <td class="table-td">${webhook.response_status || '-'}</td>
                <td class="table-td">
                    <span class="table-status-badge ${webhook.success ? 'table-status-ready' : 'table-status-error'}">
                        ${webhook.success ? 'Success' : 'Failed'}
                    </span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${webhook.error_message || '-'}</span>
                </td>
            </tr>
        `;
    });
}

// Show trigger detail
function showTriggerDetail(triggerId) {
    // This would fetch and display detailed trigger information
    const modal = document.getElementById('detailModal');
    modal.classList.add('active');
    
    // Load trigger details
    // Implementation would go here
}

// Close modal
function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('active');
}

// Refresh data
async function refreshData() {
    const activeSection = document.querySelector('.admin-section.active');
    if (!activeSection) return;
    
    const sectionId = activeSection.id;
    
    if (sectionId === 'overview') {
        await loadOverviewData();
    } else {
        await loadSectionData(sectionId);
    }
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

function showNotification(message, type) {
    // Implementation for notifications
    console.log(`${type}: ${message}`);
}

// System Logs Functions
async function loadSystemLogs() {
    try {
        // Load diagnostics
        const diagResponse = await fetch('/api/admin/diagnostics', {
            credentials: 'include'
        });
        
        if (diagResponse.ok) {
            const diagnostics = await diagResponse.json();
            displayDiagnostics(diagnostics);
        }
        
        // Load logs
        await refreshLogs();
    } catch (error) {
        console.error('Error loading system logs:', error);
    }
}

function displayDiagnostics(data) {
    // Display environment variables status
    const envStatus = document.getElementById('envStatus');
    if (envStatus) {
        const envHtml = Object.entries(data.env || {}).map(([key, value]) => {
            const isSet = value === true || (value && value !== 'not set');
            return `
                <div class="env-var-status ${isSet ? 'success' : 'error'}">
                    <span>${key}</span>
                    <span>${isSet ? '✓ Set' : '✗ Not Set'}</span>
                </div>
            `;
        }).join('');
        envStatus.innerHTML = envHtml;
    }
    
    // Display database status
    const dbStatus = document.getElementById('dbStatus');
    if (dbStatus) {
        if (data.database?.connected) {
            dbStatus.innerHTML = `
                <div class="status-success">✓ Database Connected</div>
                <div style="margin-top: 10px; color: #666;">
                    <div>URL: <code style="background: #f5f5f5; padding: 2px 5px; border-radius: 3px;">${data.database.connectionUrl || 'Not available'}</code></div>
                    <div>Last check: ${new Date(data.database.timestamp).toLocaleString()}</div>
                </div>
            `;
        } else {
            dbStatus.innerHTML = `
                <div class="status-error">✗ Database Connection Failed</div>
                <div style="margin-top: 10px; color: #dc3545;">
                    Error: ${data.database?.error || 'Unknown error'}
                </div>
            `;
        }
    }
    
    // Display RAG system status
    const ragStatus = document.getElementById('ragStatus');
    if (ragStatus) {
        const rag = data.rag || {};
        ragStatus.innerHTML = `
            <div class="rag-status-grid">
                <div class="env-var-status ${rag.hasPgVector ? 'success' : 'error'}">
                    <span>PgVector Extension</span>
                    <span>${rag.hasPgVector ? '✓ Installed' : '✗ Not Found'}</span>
                </div>
                <div class="env-var-status ${rag.hasDocumentsTable ? 'success' : 'error'}">
                    <span>Documents Table</span>
                    <span>${rag.hasDocumentsTable ? '✓ Exists' : '✗ Missing'}</span>
                </div>
                <div class="env-var-status ${rag.hasVectorsTable ? 'success' : 'error'}">
                    <span>Vectors Table</span>
                    <span>${rag.hasVectorsTable ? '✓ Exists' : '✗ Missing'}</span>
                </div>
                ${rag.hasDocumentsTable ? `
                    <div class="env-var-status success">
                        <span>Documents</span>
                        <span>${rag.documentCount || 0}</span>
                    </div>
                ` : ''}
                ${rag.hasVectorsTable ? `
                    <div class="env-var-status success">
                        <span>Vectors</span>
                        <span>${rag.vectorCount || 0}</span>
                    </div>
                ` : ''}
                ${rag.error ? `
                    <div class="env-var-status error" style="grid-column: 1 / -1;">
                        <span>Error: ${rag.error}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

async function refreshLogs() {
    try {
        const level = document.getElementById('logLevel')?.value || 'all';
        const response = await fetch(`/api/admin/logs?level=${level}&limit=100`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            displayLogs(data.logs || []);
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

function displayLogs(logs) {
    const errorLogs = document.getElementById('errorLogs');
    if (!errorLogs) return;
    
    if (logs.length === 0) {
        errorLogs.innerHTML = '<div style="color: #666;">No logs found</div>';
        return;
    }
    
    const logsHtml = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        return `
            <div class="log-entry ${log.level}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #aaa;">[${timestamp}]</span>
                    <span style="color: #888;">${log.source || 'System'}</span>
                </div>
                <div>${escapeHtml(log.message)}</div>
            </div>
        `;
    }).join('');
    
    errorLogs.innerHTML = logsHtml;
}

function filterLogs(level) {
    refreshLogs();
}

async function clearLogs() {
    if (confirm('Are you sure you want to clear all logs?')) {
        // In a real implementation, this would clear logs from the server
        document.getElementById('errorLogs').innerHTML = '<div style="color: #666;">Logs cleared</div>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// User Management Functions
async function loadUserManagementData() {
    try {
        const search = document.getElementById('userSearchInput')?.value || '';
        const tier = document.getElementById('tierFilter')?.value || '';
        const sort = document.getElementById('sortBy')?.value || 'created_at';
        const order = document.getElementById('sortOrder')?.value || 'desc';
        
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (tier) params.append('tier', tier);
        params.append('sort', sort);
        params.append('order', order);
        
        const response = await fetch(`/api/admin/users?${params}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const users = await response.json();
        updateUsersTable(users);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    }
}

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty-state">
                    <div class="table-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <h3 class="table-empty-title">No users found</h3>
                    <p class="table-empty-subtitle">Try adjusting your filters or search criteria</p>
                </td>
            </tr>`;
        return;
    }
    
    users.forEach(user => {
        const tierBadge = getTierBadge(user.tier);
        const registeredDate = formatDate(user.created_at);
        const lastLogin = user.last_login ? formatDate(user.last_login) : 'Never';
        
        tbody.innerHTML += `
            <tr class="table-tr">
                <td class="table-td table-td-primary">
                    <span class="table-link">${user.email}</span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${user.company_name || '-'}</span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${user.phone || '-'}</span>
                </td>
                <td class="table-td">${tierBadge}</td>
                <td class="table-td">${user.ticket_count || 0}</td>
                <td class="table-td">
                    <span class="table-text-secondary">${registeredDate}</span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${lastLogin}</span>
                </td>
                <td class="table-td table-td-actions">
                    <div class="table-actions">
                        <button class="table-action-btn" onclick="openEditModal('${user.email}', '${user.company_name || ''}', '${user.phone || ''}', '${user.tier}')">
                            <span class="action-btn-text">Edit</span>
                        </button>
                        ${user.email !== 'john.gorham@resolve.io' ? 
                            `<button class="table-action-btn table-action-btn-danger" onclick="deleteUser('${user.email}')"><span class="action-btn-text">Delete</span></button>` : 
                            '<span class="table-status-badge table-status-ready">Admin</span>'}
                    </div>
                </td>
            </tr>
        `;
    });
}

function getTierBadge(tier) {
    const tierColors = {
        standard: 'table-status-badge',
        premium: 'table-status-badge table-status-ready',
        enterprise: 'table-status-badge table-status-text'
    };
    
    return `<span class="${tierColors[tier] || 'table-status-badge'}">${tier || 'standard'}</span>`;
}

function openEditModal(email, company, phone, tier) {
    const modal = document.getElementById('editUserModal');
    document.getElementById('editUserEmail').value = email;
    document.getElementById('editCompanyName').value = company;
    document.getElementById('editPhone').value = phone;
    document.getElementById('editTier').value = tier;
    
    modal.style.display = 'block';
}

function closeEditModal() {
    const modal = document.getElementById('editUserModal');
    modal.style.display = 'none';
}

async function handleEditUser(e) {
    e.preventDefault();
    
    const email = document.getElementById('editUserEmail').value;
    const company_name = document.getElementById('editCompanyName').value;
    const phone = document.getElementById('editPhone').value;
    const tier = document.getElementById('editTier').value;
    
    try {
        const response = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ company_name, phone, tier })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
        
        showNotification('User updated successfully', 'success');
        closeEditModal();
        await loadUserManagementData();
        
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Failed to update user', 'error');
    }
}

async function deleteUser(email) {
    if (!confirm(`Are you sure you want to delete user ${email}? This will also delete all their data.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        
        showNotification('User deleted successfully', 'success');
        await loadUserManagementData();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);