// Handle showing/hiding users navigation button based on role
document.addEventListener('DOMContentLoaded', () => {
  const usersNavBtn = document.getElementById('users-nav-btn');
  
  // Check user role from localStorage
  const userRole = localStorage.getItem('userRole');
  const userObj = JSON.parse(localStorage.getItem('user'));
  
  if (userRole === 'tenant-admin' || (userObj && userObj.role === 'tenant-admin')) {
    usersNavBtn.style.display = 'block';
  }
});