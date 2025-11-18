const API_URL = 'https://lynxauth.onrender.com';
let loggedInOwnerId = null;
let loggedInUsername = null;

// Load saved credentials on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedCredentials();
});

function loadSavedCredentials() {
    const savedUsername = localStorage.getItem('lynx_username');
    const savedPassword = localStorage.getItem('lynx_password');
    
    if (savedUsername && savedPassword) {
        document.getElementById('login-username').value = savedUsername;
        document.getElementById('login-password').value = savedPassword;
        document.getElementById('remember-me').checked = true;
    }
}

// Mobile menu functionality
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-open');
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary feedback
        const originalText = element.textContent;
        element.textContent = 'Copied!';
        element.style.color = 'var(--success)';
        
        setTimeout(() => {
            element.textContent = originalText;
            element.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    });
}

// Copy app secret function with Font Awesome
function copyAppSecret(appSecret, buttonElement) {
    navigator.clipboard.writeText(appSecret).then(() => {
        // Show feedback on the button
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        buttonElement.style.color = 'var(--success)';
        
        setTimeout(() => {
            buttonElement.innerHTML = originalHTML;
            buttonElement.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    });
}

// Toggle app item expansion
function toggleAppItem(appId) {
    const appItem = document.getElementById(`app-item-${appId}`);
    appItem.classList.toggle('expanded');
}

function showView(viewName) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-content`).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-nav a[onclick="showView('${viewName}')"]`).classList.add('active');
    
    // Close mobile menu after navigation
    if (window.innerWidth <= 768) {
        toggleMobileMenu();
    }
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function openModal() { 
    document.getElementById('manage-users-modal').style.display = 'flex'; 
}

function closeModal() { 
    document.getElementById('manage-users-modal').style.display = 'none'; 
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    await apiCall('/register', { username, password }, 'auth-message', 'Registration successful! Please login.');
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Save credentials if "Remember me" is checked
    if (rememberMe) {
        localStorage.setItem('lynx_username', username);
        localStorage.setItem('lynx_password', password);
    } else {
        // Clear saved credentials if not checked
        localStorage.removeItem('lynx_username');
        localStorage.removeItem('lynx_password');
    }
    
    const data = await apiCall('/login', { username, password }, 'auth-message');
    if (data && data.status === 'success') {
        document.getElementById('auth-message').style.display = 'none';
        loggedInOwnerId = data.ownerid;
        loggedInUsername = username;
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'grid';
        document.getElementById('sidebar-username').textContent = username;
        document.getElementById('ownerid-display').textContent = loggedInOwnerId;
        loadApps();
    }
}

function logout() {
    loggedInOwnerId = null;
    loggedInUsername = null;
    location.reload(); 
}

async function deleteAccount() {
    if (confirm('ARE YOU SURE you want to delete your entire account? This will also delete ALL your applications and ALL end-users. This action cannot be undone.')) {
        const data = await apiCall('/seller/delete', { ownerid: loggedInOwnerId }, 'dashboard-message');
        if (data && data.status === 'success') {
            alert('Account deleted successfully.');
            logout();
        }
    }
}

async function createApp() {
    const app_name = document.getElementById('app-name').value;
    if (!app_name) return alert('Please enter an application name.');
    await apiCall('/apps/create', { ownerid: loggedInOwnerId, app_name }, 'dashboard-message', 'Application created!');
    document.getElementById('app-name').value = '';
    loadApps();
}

async function loadApps() {
    const data = await apiCall('/apps/list', { ownerid: loggedInOwnerId }, 'dashboard-message');
    const appsListDiv = document.getElementById('apps-list');
    appsListDiv.innerHTML = '';
    
    if (data && data.apps && data.apps.length > 0) {
        data.apps.forEach(app => {
            const appItem = document.createElement('div');
            appItem.className = 'app-item';
            appItem.id = `app-item-${app.appid}`;
            
            appItem.innerHTML = `
                <div class="app-item-header" onclick="toggleAppItem('${app.appid}')">
                    <h4>${app.name}</h4>
                    <span class="app-arrow">▼</span>
                </div>
                <div class="app-item-content">
                    <div class="app-item-body">
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin:0;">Application Details</h4>
                            <button class="small danger" onclick="deleteApp('${app.appid}', '${app.name}')">Delete App</button>
                        </div>
                        
                        <div class="info-box">
                            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
                                <strong>App Secret:</strong>
                                <button class="copy-btn small" onclick="copyAppSecret('${app.app_secret}', this)">
                                    <i class="fa-solid fa-copy"></i>
                                    Copy Secret
                                </button>
                            </div>
                            <code style="margin-top: 8px; display: block;">${app.app_secret}</code>
                        </div>
                        
                        <hr style="border-color:var(--border-color); margin: 1.5rem 0;">
                        
                        <h4>Create End-User for this App</h4>
                        <input type="text" id="user-username-${app.appid}" placeholder="End-User's Username">
                        <input type="text" id="user-password-${app.appid}" placeholder="End-User's Password">
                        <input type="number" id="user-days-${app.appid}" placeholder="Subscription Days (0 for lifetime)" value="30">
                        <button onclick="createEndUser('${app.appid}')">Create User</button>
                        
                        <hr style="border-color:var(--border-color); margin: 1.5rem 0;">
                        
                        <button onclick="manageUsers('${app.appid}', '${app.name}')">Manage Users</button>
                    </div>
                </div>
            `;
            appsListDiv.appendChild(appItem);
        });
    } else {
        appsListDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No applications created yet.</p>';
    }
}

async function deleteApp(appid, appName) {
    if (confirm(`Are you sure you want to delete the application '${appName}'? This will also delete all of its end-users and cannot be undone.`)) {
        const data = await apiCall('/apps/delete', { appid: appid }, 'dashboard-message');
        if (data && data.status === 'success') {
            alert('Application deleted successfully!');
            loadApps(); 
        }
    }
}

async function createEndUser(appid) {
    const username = document.getElementById(`user-username-${appid}`).value;
    const password = document.getElementById(`user-password-${appid}`).value;
    const days = document.getElementById(`user-days-${appid}`).value;
    if(!username || !password) return alert("Please provide a username and password.");
    
    const data = await apiCall('/users/create', { ownerid: loggedInOwnerId, appid, username, password, days: parseInt(days) }, 'dashboard-message');
    if (data && data.status === 'success') {
        alert(`User '${username}' has been created successfully!`);
        document.getElementById(`user-username-${appid}`).value = '';
        document.getElementById(`user-password-${appid}`).value = '';
    }
}

async function manageUsers(appid, appName) {
    document.getElementById('modal-app-name').textContent = `Manage Users for ${appName}`;
    const userListContainer = document.getElementById('user-list-container');
    userListContainer.innerHTML = 'Loading...';
    openModal();
    
    const data = await apiCall('/users/list', { appid }, 'dashboard-message');
    
    if (data && data.users && data.users.length > 0) {
        userListContainer.innerHTML = '';
        data.users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-list-item';
            const expiryDate = new Date(user.expires_at).toLocaleString();
            item.innerHTML = `
                <div>
                    <strong>${user.username}</strong><br>
                    <small>Expires: ${expiryDate}</small>
                </div>
                <div>
                    <input type="number" id="extend-days-${user.id}" placeholder="Days" value="30" style="width: 80px; display: inline-block; vertical-align: middle;">
                    <button class="small" onclick="extendUser(${user.id}, '${appid}', '${appName}')">Extend</button>
                    <button class="small danger" onclick="deleteUser(${user.id}, '${appid}', '${appName}')">Delete</button>
                </div>
            `;
            userListContainer.appendChild(item);
        });
    } else {
        userListContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No users have been created for this application yet.</p>';
    }
}

async function deleteUser(userId, appid, appName) {
    if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
        await apiCall('/users/delete', { user_id: userId }, 'dashboard-message');
        await manageUsers(appid, appName);
    }
}

async function extendUser(userId, appid, appName) {
    const daysInput = document.getElementById(`extend-days-${userId}`);
    const days = daysInput.value;
    if (!days || parseInt(days) <= 0) return alert('Please enter a valid number of days to extend.');
    
    await apiCall('/users/extend', { user_id: userId, days: parseInt(days) }, 'dashboard-message');
    await manageUsers(appid, appName);
}

async function apiCall(endpoint, body, messageElId, successMessage) {
    const messageEl = document.getElementById(messageElId);
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.style.display = 'none';
    }

    try {
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (response.ok) {
            if (successMessage && messageEl) {
                messageEl.textContent = successMessage;
                messageEl.style.color = 'var(--success)';
                messageEl.style.display = 'block';
            }
            return data;
        } else {
            if (messageEl) {
                messageEl.textContent = `Error: ${data.detail || 'An unknown error occurred.'}`;
                messageEl.style.color = 'var(--danger)';
                messageEl.style.display = 'block';
            }
            return null;
        }
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = 'Error: Could not connect to the server.';
            messageEl.style.color = 'var(--danger)';
            messageEl.style.display = 'block';
        }
        console.error("API Call Error:", error);
        return null;
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(event.target) && 
        !mobileBtn.contains(event.target)) {
        sidebar.classList.remove('mobile-open');
    }
});