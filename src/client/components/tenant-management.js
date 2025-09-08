class TenantManagement {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchQuery = '';
        this.roleFilter = '';
        this.statusFilter = '';
        this.sortField = 'created_at';
        this.sortDir = 'desc';
        this.users = [];
        this.totalUsers = 0;
        this.selectedUsers = new Set();
        
        this.init();
    }

    async init() {
        this.renderContainer();
        await this.loadUsers();
        this.attachEventListeners();
    }

    renderContainer() {
        const container = document.getElementById('usersContainer');
        container.innerHTML = `
            <div class="data-grid-container">
                <!-- Header -->
                <div class="data-grid-header">
                    <h1 class="data-grid-title">Tenant Management</h1>
                    <button class="action-btn action-btn-primary action-btn-medium" onclick="tenantManagement.showAddUserModal()">
                        <span class="action-btn-text">Add User</span>
                    </button>
                </div>

                <!-- Toolbar -->
                <div class="data-grid-toolbar">
                    <div class="data-grid-toolbar-left">
                        <div class="data-grid-search-container">
                            <div class="data-grid-search-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                            </div>
                            <input type="text" id="userSearchInput" class="data-grid-search-input" placeholder="Search users...">
                        </div>
                        
                        <select id="roleFilter" class="data-grid-filter-select">
                            <option value="">All Roles</option>
                            <option value="tenant-admin">Tenant Admin</option>
                            <option value="user">User</option>
                        </select>
                        
                        <select id="statusFilter" class="data-grid-filter-select">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="invited">Invited</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>

                <!-- Bulk Actions -->
                <div id="selectedActions" class="data-grid-bulk-actions">
                    <span id="selectedCount" class="data-grid-bulk-count">0 selected</span>
                    <button onclick="tenantManagement.bulkResetPassword()" class="data-grid-bulk-btn">
                        Reset Password
                    </button>
                    <button onclick="tenantManagement.bulkDisable()" class="data-grid-bulk-btn">
                        Disable
                    </button>
                    <button onclick="tenantManagement.bulkDelete()" class="data-grid-bulk-btn data-grid-bulk-btn-danger">
                        Delete
                    </button>
                </div>

                <!-- Users Grid using Generic Table Component -->
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th class="table-th table-th-checkbox">
                                    <input type="checkbox" id="selectAllUsers" class="table-checkbox">
                                </th>
                                <th class="table-th table-th-sortable" onclick="tenantManagement.toggleSort('full_name')">
                                    Name
                                    <span class="table-sort-icon">↕</span>
                                </th>
                                <th class="table-th table-th-sortable" onclick="tenantManagement.toggleSort('email')">
                                    Email
                                    <span class="table-sort-icon">↕</span>
                                </th>
                                <th class="table-th table-th-sortable" onclick="tenantManagement.toggleSort('role')">
                                    Role
                                    <span class="table-sort-icon">↕</span>
                                </th>
                                <th class="table-th table-th-sortable" onclick="tenantManagement.toggleSort('status')">
                                    Status
                                    <span class="table-sort-icon">↕</span>
                                </th>
                                <th class="table-th table-th-sortable" onclick="tenantManagement.toggleSort('last_login_at')">
                                    Last Login
                                    <span class="table-sort-icon">↕</span>
                                </th>
                                <th class="table-th">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <!-- Users will be rendered here -->
                        </tbody>
                    </table>
                    
                    <div id="emptyState" class="table-empty-state" style="display: none;">
                        <div class="table-empty-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <h3 class="table-empty-title">No users found</h3>
                        <p class="table-empty-subtitle">Add your first user to get started</p>
                        <button onclick="tenantManagement.showAddUserModal()" 
                                class="action-btn action-btn-primary action-btn-medium">
                            <span class="action-btn-text">Add User</span>
                        </button>
                    </div>
                </div>

                <!-- Footer with Pagination -->
                <div id="pagination" class="data-grid-footer">
                    <div class="data-grid-footer-info">
                        Showing <span id="showingFrom">0</span>-<span id="showingTo">0</span> of <span id="totalCount">0</span> users
                    </div>
                    <div class="data-grid-pagination">
                        <button id="prevPage" onclick="tenantManagement.previousPage()" 
                                class="data-grid-pagination-btn">
                            Previous
                        </button>
                        <span id="pageInfo" class="data-grid-pagination-info">Page 1</span>
                        <button id="nextPage" onclick="tenantManagement.nextPage()" 
                                class="data-grid-pagination-btn">
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modals will be appended here -->
        `;

        // Add styles
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .role-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            .role-admin {
                background: #ede9fe;
                color: #7c3aed;
            }
            .role-user {
                background: #f3f4f6;
                color: #6b7280;
            }
            .status-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            .status-active {
                background: #d4f4dd;
                color: #22c55e;
            }
            .status-invited {
                background: #fef3c7;
                color: #f59e0b;
            }
            .status-disabled {
                background: #fee2e2;
                color: #ef4444;
            }
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background: white;
                border: 1px solid #e1e1e1;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            .action-btn {
                margin-right: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    async loadUsers() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize,
                q: this.searchQuery,
                role: this.roleFilter,
                status: this.statusFilter,
                sort: `${this.sortField}:${this.sortDir}`
            });

            const response = await fetch(`/api/tenants/${this.tenantId}/users?${params}`, {
                credentials: 'include'  // Include cookies in request
            });

            if (!response.ok) {
                throw new Error('Failed to load users');
            }

            const data = await response.json();
            this.users = data.data;
            this.totalUsers = data.total;
            this.renderUsers();
            this.updatePagination();
        } catch (error) {
            console.error('Error loading users:', error);
            this.showToast('Failed to load users', 'error');
        }
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        const emptyState = document.getElementById('emptyState');

        if (this.users.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = this.users.map(user => `
            <tr class="table-tr">
                <td class="table-td table-td-checkbox">
                    <input type="checkbox" class="table-checkbox user-checkbox" data-user-id="${user.id}">
                </td>
                <td class="table-td table-td-primary">
                    <div class="table-cell-content">
                        <span class="table-link">${user.name || 'N/A'}</span>
                    </div>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">${user.email}</span>
                </td>
                <td class="table-td">
                    <span class="role-badge ${user.role === 'tenant-admin' ? 'role-admin' : 'role-user'}">
                        ${user.role === 'tenant-admin' ? 'Admin' : 'User'}
                    </span>
                </td>
                <td class="table-td">
                    <span class="status-badge status-${user.status}">
                        ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                </td>
                <td class="table-td">
                    <span class="table-text-secondary">
                        ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </span>
                </td>
                <td class="table-td table-td-actions">
                    <div class="table-actions">
                        <button class="table-action-btn" title="Edit" onclick="tenantManagement.editUser(${user.id})">
                            <span class="action-btn-text">Edit</span>
                        </button>
                        <button class="table-action-btn" title="Reset Password" onclick="tenantManagement.resetPassword(${user.id})">
                            <span class="action-btn-text">Reset</span>
                        </button>
                        ${user.status === 'active' ? 
                            `<button class="table-action-btn" title="Disable" onclick="tenantManagement.disableUser(${user.id})"><span class="action-btn-text">Disable</span></button>` :
                            `<button class="table-action-btn" title="Enable" onclick="tenantManagement.enableUser(${user.id})"><span class="action-btn-text">Enable</span></button>`
                        }
                        <button class="table-action-btn table-action-btn-danger" title="Delete" onclick="tenantManagement.deleteUser(${user.id})">
                            <span class="action-btn-text">Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.attachCheckboxListeners();
    }

    updatePagination() {
        const from = (this.currentPage - 1) * this.pageSize + 1;
        const to = Math.min(this.currentPage * this.pageSize, this.totalUsers);

        document.getElementById('showingFrom').textContent = from;
        document.getElementById('showingTo').textContent = to;
        document.getElementById('totalCount').textContent = this.totalUsers;
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage}`;

        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = to >= this.totalUsers;
    }

    attachEventListeners() {
        // Search input
        document.getElementById('userSearchInput').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 300);
        });

        // Filters
        document.getElementById('roleFilter').addEventListener('change', (e) => {
            this.roleFilter = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Select all checkbox
        document.getElementById('selectAllUsers').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const userId = parseInt(cb.dataset.userId);
                if (e.target.checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                }
            });
            this.updateSelectedActions();
        });
    }

    attachCheckboxListeners() {
        document.querySelectorAll('.user-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const userId = parseInt(e.target.dataset.userId);
                if (e.target.checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                }
                this.updateSelectedActions();
            });
        });
    }

    updateSelectedActions() {
        const selectedActions = document.getElementById('selectedActions');
        const selectedCount = document.getElementById('selectedCount');

        if (this.selectedUsers.size > 0) {
            selectedActions.style.height = '64px';
            selectedActions.style.padding = '16px 32px';
            selectedCount.textContent = `${this.selectedUsers.size} user${this.selectedUsers.size > 1 ? 's' : ''} selected`;
        } else {
            selectedActions.style.height = '0';
            selectedActions.style.padding = '0 32px';
        }
    }

    renderSortIcon(field) {
        if (this.sortField === field) {
            return this.sortDir === 'asc' 
                ? '<span class="km-sort-icon km-sort-asc">↑</span>' 
                : '<span class="km-sort-icon km-sort-desc">↓</span>';
        }
        return '<span class="km-sort-icon">↕</span>';
    }

    toggleSort(field) {
        if (this.sortField === field) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDir = 'asc';
        }
        this.loadUsers();
        this.updateSortIcons();
    }
    
    updateSortIcons() {
        // Update sort icons in the table headers
        document.querySelectorAll('.table-th-sortable').forEach(th => {
            const sortIcon = th.querySelector('.table-sort-icon');
            if (sortIcon) {
                const field = th.getAttribute('onclick').match(/toggleSort\('([^']+)'/)[1];
                if (this.sortField === field) {
                    sortIcon.innerHTML = this.sortDir === 'asc' ? '↑' : '↓';
                    th.classList.add('table-th-sorted');
                } else {
                    sortIcon.innerHTML = '↕';
                    th.classList.remove('table-th-sorted');
                }
            }
        });
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadUsers();
        }
    }

    nextPage() {
        const maxPage = Math.ceil(this.totalUsers / this.pageSize);
        if (this.currentPage < maxPage) {
            this.currentPage++;
            this.loadUsers();
        }
    }

    showAddUserModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h2 style="color: #374151; margin-bottom: 24px;">Add New User</h2>
                <form id="addUserForm">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; color: #6b7280; margin-bottom: 8px; font-size: 14px;">Name</label>
                        <input type="text" name="name" required
                               style="width: 100%; padding: 10px; background: white; border: 1px solid #e1e1e1;
                                      border-radius: 6px; color: #374151;">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; color: #6b7280; margin-bottom: 8px; font-size: 14px;">Email</label>
                        <input type="email" name="email" required
                               style="width: 100%; padding: 10px; background: white; border: 1px solid #e1e1e1;
                                      border-radius: 6px; color: #374151;">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; color: #6b7280; margin-bottom: 8px; font-size: 14px;">Role</label>
                        <select name="role" required
                                style="width: 100%; padding: 10px; background: white; border: 1px solid #e1e1e1;
                                       border-radius: 6px; color: #374151;">
                            <option value="user">User</option>
                            <option value="tenant-admin">Tenant Admin</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <label style="display: flex; align-items: center; color: #6b7280; cursor: pointer;">
                            <input type="checkbox" name="invite" checked style="margin-right: 8px;">
                            Send invitation email
                        </label>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button type="button" onclick="this.closest('.modal-overlay').remove()"
                                class="action-btn action-btn-secondary action-btn-medium">
                            <span class="action-btn-text">Cancel</span>
                        </button>
                        <button type="submit"
                                class="action-btn action-btn-primary action-btn-medium">
                            <span class="action-btn-text">Add User</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('addUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.createUser({
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role'),
                invite: formData.get('invite') === 'on'
            });
            modal.remove();
        });
    }

    async createUser(userData) {
        try {
            const response = await fetch(`/api/tenants/${this.tenantId}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',  // Include cookies in request
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            if (data.resetLink) {
                this.showResetLinkModal(data.resetLink);
            }

            // Refresh the table first, then show success
            await this.loadUsers();
            this.showToast('User created successfully', 'success');
        } catch (error) {
            console.error('Error creating user:', error);
            this.showToast(error.message, 'error');
        }
    }

    async resetPassword(userId) {
        try {
            const response = await fetch(`/api/tenants/${this.tenantId}/users/${userId}/reset-password`, {
                method: 'POST',
                credentials: 'include'  // Include cookies in request
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            this.showResetLinkModal(data.resetLink, data.expiresAt);
            this.showToast('Password reset link generated', 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            this.showToast(error.message, 'error');
        }
    }

    showResetLinkModal(link, expiresAt) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h2 style="color: #374151; margin-bottom: 16px;">Password Reset Link</h2>
                <p style="color: #6b7280; margin-bottom: 16px;">
                    Copy this link and share it with the user. 
                    ${expiresAt ? `It expires at ${new Date(expiresAt).toLocaleString()}.` : 'It expires in 24 hours.'}
                </p>
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <input type="text" value="${link}" readonly
                           style="flex: 1; padding: 10px; background: #f8f9fa; border: 1px solid #e1e1e1;
                                  border-radius: 6px; color: #0066FF; font-family: monospace; font-size: 12px;">
                    <button onclick="navigator.clipboard.writeText('${link}'); tenantManagement.showToast('Link copied!', 'success')"
                            class="action-btn action-btn-secondary action-btn-small">
                        <span class="action-btn-text">Copy</span>
                    </button>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="this.closest('.modal-overlay').remove()"
                            class="action-btn action-btn-primary action-btn-medium">
                        <span class="action-btn-text">Done</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    deleteUser(userId) {
        // Find the user for display
        const user = this.users.find(u => u.id === userId);
        const userName = user ? user.name : 'this user';
        const userEmail = user ? user.email : '';
        
        this.showDeleteConfirmation(userId, userName, userEmail);
    }

    showDeleteConfirmation(userId, userName, userEmail) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content delete-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Delete User</h3>
                </div>
                <div class="modal-body">
                    <p class="delete-modal-text">
                        Are you sure you want to delete <strong>${userName}</strong> (${userEmail})? 
                    </p>
                    <p class="delete-modal-warning" style="color: #ef4444; margin-top: 12px; font-size: 14px;">
                        This action cannot be undone.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary" data-action="cancel">Cancel</button>
                    <button class="modal-btn primary delete-btn" data-action="delete" style="background: #ef4444;">
                        Delete User
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modalOverlay.classList.add('show');
        });
        
        // Handle button clicks
        const handleClick = (e) => {
            const action = e.target.dataset.action;
            
            if (action === 'cancel') {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
            } else if (action === 'delete') {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
                this.performDeleteUser(userId);
            }
        };
        
        modalOverlay.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleClick);
        });
        
        // Close on background click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('show');
                setTimeout(() => modalOverlay.remove(), 300);
            }
        });
    }

    async performDeleteUser(userId) {
        try {
            const response = await fetch(`/api/tenants/${this.tenantId}/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'  // Include cookies in request
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }

            // Refresh the table first, then show success
            await this.loadUsers();
            this.showToast('User deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast(error.message, 'error');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

// Make it globally available
window.TenantManagement = TenantManagement;