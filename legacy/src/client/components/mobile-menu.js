// Mobile Menu Handler
class MobileMenu {
  constructor() {
    this.leftSidebar = null;
    this.rightSidebar = null;
    this.overlay = null;
    this.menuToggle = null;
    this.currentSidebar = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Create mobile menu toggle button
    this.createMobileToggle();
    
    // Create overlay
    this.createOverlay();
    
    // Get sidebars
    this.leftSidebar = document.querySelector('.left-sidebar');
    this.rightSidebar = document.querySelector('.right-sidebar');
    
    // Add touch gestures
    this.addTouchGestures();
    
    // Add resize handler
    this.addResizeHandler();
    
    // Setup keyboard navigation
    this.setupKeyboardNav();
  }

  createMobileToggle() {
    // Only create on dashboard pages
    if (!document.querySelector('.dashboard-layout')) return;
    
    // Don't show hamburger if we're in a chat-only view
    const hasSidebars = document.querySelector('.left-sidebar') || document.querySelector('.right-sidebar');
    if (!hasSidebars) return;
    
    // Check if we're on mobile
    if (window.innerWidth > 768) return;
    
    this.menuToggle = document.createElement('button');
    this.menuToggle.className = 'mobile-menu-toggle';
    this.menuToggle.setAttribute('aria-label', 'Toggle menu');
    this.menuToggle.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    
    document.body.appendChild(this.menuToggle);
    
    this.menuToggle.addEventListener('click', () => this.toggleLeftSidebar());
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'mobile-overlay';
    document.body.appendChild(this.overlay);
    
    this.overlay.addEventListener('click', () => this.closeAllSidebars());
  }

  toggleLeftSidebar() {
    if (this.leftSidebar) {
      const isActive = this.leftSidebar.classList.contains('active');
      
      if (isActive) {
        this.closeSidebar(this.leftSidebar);
      } else {
        this.openSidebar(this.leftSidebar);
      }
    }
  }

  toggleRightSidebar() {
    if (this.rightSidebar) {
      const isActive = this.rightSidebar.classList.contains('active');
      
      if (isActive) {
        this.closeSidebar(this.rightSidebar);
      } else {
        this.openSidebar(this.rightSidebar);
      }
    }
  }

  openSidebar(sidebar) {
    // Close other sidebar first
    this.closeAllSidebars();
    
    sidebar.classList.add('active');
    document.body.classList.add('sidebar-open');
    this.overlay.classList.add('active');
    this.currentSidebar = sidebar;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Focus management
    const firstFocusable = sidebar.querySelector('button, input, a');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  closeSidebar(sidebar) {
    sidebar.classList.remove('active');
    this.overlay.classList.remove('active');
    
    // Check if any sidebar is still open
    const hasActiveSidebar = document.querySelector('.left-sidebar.active, .right-sidebar.active');
    if (!hasActiveSidebar) {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    }
    
    if (this.currentSidebar === sidebar) {
      this.currentSidebar = null;
    }
  }

  closeAllSidebars() {
    if (this.leftSidebar) {
      this.closeSidebar(this.leftSidebar);
    }
    if (this.rightSidebar) {
      this.closeSidebar(this.rightSidebar);
    }
  }

  addTouchGestures() {
    let startX = 0;
    let startY = 0;
    let dist = 0;
    let threshold = 50; // minimum distance for swipe
    let allowedTime = 300; // maximum time for swipe
    let startTime = 0;

    // Swipe to open left sidebar from left edge
    document.addEventListener('touchstart', (e) => {
      const touchobj = e.changedTouches[0];
      startX = touchobj.pageX;
      startY = touchobj.pageY;
      startTime = new Date().getTime();
      
      // Only track if starting from left edge
      if (startX < 20 && !this.currentSidebar) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      const touchobj = e.changedTouches[0];
      dist = touchobj.pageX - startX;
      const elapsedTime = new Date().getTime() - startTime;
      const verticalDist = Math.abs(touchobj.pageY - startY);
      
      // Check for right swipe from left edge
      if (startX < 20 && dist > threshold && elapsedTime <= allowedTime && verticalDist < 100) {
        if (this.leftSidebar && !this.currentSidebar) {
          this.openSidebar(this.leftSidebar);
        }
      }
      
      // Check for left swipe to close sidebar
      if (this.currentSidebar && dist < -threshold && elapsedTime <= allowedTime && verticalDist < 100) {
        this.closeAllSidebars();
      }
    });
  }

  addResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Close sidebars when resizing to desktop
        if (window.innerWidth > 768) {
          this.closeAllSidebars();
          document.body.style.overflow = '';
        }
      }, 250);
    });
  }

  setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Close on Escape
      if (e.key === 'Escape' && this.currentSidebar) {
        this.closeAllSidebars();
      }
    });
  }
}

// Initialize mobile menu when DOM is ready
const mobileMenu = new MobileMenu();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileMenu;
}