// Resolve Analytics Tracker
// Comprehensive marketing analytics for onboarding journey

(function() {
    'use strict';
    
    // Analytics configuration
    const AnalyticsTracker = {
        sessionId: null,
        userEmail: null,
        pageMetricId: null,
        startTime: Date.now(),
        pageStartTime: Date.now(),
        currentStep: null,
        stepStartTime: null,
        clickCount: 0,
        maxScrollDepth: 0,
        utm: {},
        
        // Initialize tracking
        init: function() {
            // Generate or retrieve session ID
            this.sessionId = sessionStorage.getItem('analytics_session_id') || this.generateSessionId();
            sessionStorage.setItem('analytics_session_id', this.sessionId);
            
            // Parse UTM parameters
            this.parseUTM();
            
            // Track page load
            this.trackPageEnter();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Track initial page view
            this.trackEvent('page_view', 'navigation', {
                page: window.location.pathname,
                referrer: document.referrer,
                utm: this.utm
            });
            
            console.log('📊 Analytics tracker initialized:', this.sessionId);
        },
        
        generateSessionId: function() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        parseUTM: function() {
            const params = new URLSearchParams(window.location.search);
            this.utm = {
                source: params.get('utm_source') || '',
                medium: params.get('utm_medium') || '',
                campaign: params.get('utm_campaign') || '',
                term: params.get('utm_term') || '',
                content: params.get('utm_content') || ''
            };
            
            // Store UTM in session for later use
            if (Object.values(this.utm).some(v => v)) {
                sessionStorage.setItem('utm_params', JSON.stringify(this.utm));
            } else {
                // Try to get from session storage
                const stored = sessionStorage.getItem('utm_params');
                if (stored) {
                    this.utm = JSON.parse(stored);
                }
            }
        },
        
        setupEventListeners: function() {
            const self = this;
            
            // Track all clicks
            document.addEventListener('click', function(e) {
                self.clickCount++;
                
                const target = e.target.closest('a, button, input[type="submit"], .clickable');
                if (target) {
                    const eventData = {
                        element: target.tagName,
                        text: target.textContent?.substring(0, 50),
                        id: target.id,
                        class: target.className,
                        href: target.href
                    };
                    
                    // Special tracking for important buttons
                    if (target.textContent?.includes('Sign Up') || target.textContent?.includes('Get Started')) {
                        self.trackEvent('cta_click', 'engagement', eventData);
                    } else if (target.textContent?.includes('Premium') || target.textContent?.includes('Standard')) {
                        self.trackEvent('tier_selection', 'conversion', eventData);
                    } else {
                        self.trackEvent('click', 'interaction', eventData);
                    }
                }
            });
            
            // Track form interactions
            document.addEventListener('focus', function(e) {
                if (e.target.matches('input, textarea, select')) {
                    self.trackEvent('form_interaction', 'engagement', {
                        field: e.target.name || e.target.id,
                        type: e.target.type
                    });
                }
            }, true);
            
            // Track form submissions
            document.addEventListener('submit', function(e) {
                const form = e.target;
                self.trackEvent('form_submit', 'conversion', {
                    formId: form.id,
                    formAction: form.action,
                    fields: Array.from(form.elements).map(el => el.name).filter(n => n)
                });
            });
            
            // Track scroll depth
            let scrollTimer;
            window.addEventListener('scroll', function() {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function() {
                    const scrollPercent = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
                    if (scrollPercent > self.maxScrollDepth) {
                        self.maxScrollDepth = scrollPercent;
                        
                        // Track milestone scroll depths
                        if ([25, 50, 75, 90, 100].includes(scrollPercent)) {
                            self.trackEvent('scroll_depth', 'engagement', {
                                depth: scrollPercent
                            });
                        }
                    }
                }, 100);
            });
            
            // Track page leave
            window.addEventListener('beforeunload', function() {
                self.trackPageLeave();
            });
            
            // Track visibility changes
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    self.trackEvent('tab_hidden', 'engagement', {
                        timeOnPage: Math.round((Date.now() - self.pageStartTime) / 1000)
                    });
                } else {
                    self.trackEvent('tab_visible', 'engagement', {});
                }
            });
        },
        
        // Track funnel steps
        trackFunnelStep: function(stepName, stepNumber, action = 'start') {
            const self = this;
            
            if (action === 'start') {
                this.currentStep = stepName;
                this.stepStartTime = Date.now();
            }
            
            const data = {
                session_id: this.sessionId,
                user_email: this.userEmail,
                step_name: stepName,
                step_number: stepNumber,
                action: action
            };
            
            if (action !== 'start' && this.stepStartTime) {
                data.time_spent_seconds = Math.round((Date.now() - this.stepStartTime) / 1000);
            }
            
            fetch('/api/analytics/funnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.error('Analytics error:', err));
            
            // Also track as event
            this.trackEvent(`funnel_${action}`, 'funnel', {
                step: stepName,
                number: stepNumber
            });
        },
        
        // Track generic events
        trackEvent: function(eventType, eventCategory, eventData) {
            const data = {
                session_id: this.sessionId,
                user_email: this.userEmail,
                event_type: eventType,
                event_category: eventCategory,
                event_data: eventData,
                page_url: window.location.href
            };
            
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.error('Analytics error:', err));
        },
        
        // Track conversions
        trackConversion: function(conversionType, value, tierSelected) {
            const data = {
                session_id: this.sessionId,
                user_email: this.userEmail,
                conversion_type: conversionType,
                conversion_value: value,
                tier_selected: tierSelected,
                utm_params: new URLSearchParams(this.utm).toString()
            };
            
            fetch('/api/analytics/conversion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.error('Analytics error:', err));
            
            // Also track as event
            this.trackEvent('conversion', 'conversion', {
                type: conversionType,
                value: value,
                tier: tierSelected
            });
        },
        
        // Page metrics
        trackPageEnter: function() {
            const self = this;
            this.pageStartTime = Date.now();
            this.clickCount = 0;
            this.maxScrollDepth = 0;
            
            const data = {
                session_id: this.sessionId,
                user_email: this.userEmail,
                page_path: window.location.pathname,
                action: 'enter'
            };
            
            fetch('/api/analytics/page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(res => res.json())
              .then(result => {
                  if (result.metric_id) {
                      self.pageMetricId = result.metric_id;
                  }
              })
              .catch(err => console.error('Analytics error:', err));
        },
        
        trackPageLeave: function() {
            if (!this.pageMetricId) return;
            
            const data = {
                session_id: this.sessionId,
                metric_id: this.pageMetricId,
                action: 'leave',
                time_on_page_seconds: Math.round((Date.now() - this.pageStartTime) / 1000),
                scroll_depth_percent: this.maxScrollDepth,
                clicks_count: this.clickCount
            };
            
            // Use sendBeacon for reliability
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon('/api/analytics/page', blob);
        },
        
        // Set user email when they log in or sign up
        setUserEmail: function(email) {
            this.userEmail = email;
            sessionStorage.setItem('analytics_user_email', email);
        },
        
        // Track specific onboarding events
        trackOnboardingEvent: function(eventName, data) {
            this.trackEvent(eventName, 'onboarding', data);
        },
        
        // Helper to track tier selection
        trackTierSelection: function(tier, price) {
            this.trackEvent('tier_selected', 'conversion', { tier, price });
            this.trackConversion('tier_selection', price, tier);
        },
        
        // Track integration setup
        trackIntegrationSetup: function(integrationType, success) {
            this.trackEvent('integration_setup', 'onboarding', {
                type: integrationType,
                success: success
            });
            
            if (success) {
                this.trackConversion('integration_complete', 0, integrationType);
            }
        },
        
        // Track CSV upload
        trackCSVUpload: function(filename, lineCount, size) {
            this.trackEvent('csv_upload', 'engagement', {
                filename: filename,
                lineCount: lineCount,
                size: size
            });
            
            this.trackConversion('data_upload', lineCount, 'csv');
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            AnalyticsTracker.init();
        });
    } else {
        AnalyticsTracker.init();
    }
    
    // Expose to global scope for manual tracking
    window.ResolveAnalytics = AnalyticsTracker;
})();