export class PricingCard {
    constructor(containerId, onSelectPlan) {
        this.container = document.getElementById(containerId);
        this.onSelectPlan = onSelectPlan;
        this.selectedTier = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="rita-callout">
                <h3>🤖 Meet Rita - Your AI Service Desk Agent</h3>
                <p>Available in Premium: Rita handles tickets, creates workflows, and provides 24/7 intelligent support</p>
            </div>
            
            <div class="pricing-tiers">
                ${this.renderBasicTier()}
                ${this.renderPremiumTier()}
            </div>
        `;
    }

    renderBasicTier() {
        return `
            <div class="tier-card basic-tier" data-tier="basic">
                <div class="tier-header">
                    <h3>Basic Plan</h3>
                    <div class="price">$10<span>/user/month</span></div>
                    <p class="price-note">After 30-day free trial</p>
                </div>
                <div class="tier-features">
                    <div class="feature-item">
                        <span class="check">✅</span>
                        <span>30-day free trial</span>
                    </div>
                    <div class="feature-item">
                        <span class="check">✅</span>
                        <span>Cancel anytime</span>
                    </div>
                    <div class="feature-item">
                        <span class="check">✅</span>
                        <span>AI assisted research common issues</span>
                    </div>
                </div>
                <div class="benefits-box">
                    <h5>🔍 AI Analysis & Insights:</h5>
                    <div class="benefit-item">
                        <span class="icon">📊</span>
                        <span>Deep analysis of your last 90 days of tickets</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">🎯</span>
                        <span>Top 10 automation opportunities ranked by impact</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">🔬</span>
                        <span>Research common issues and root causes</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">📈</span>
                        <span>Time & cost savings calculator</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">🔄</span>
                        <span>Workflow optimization recommendations</span>
                    </div>
                </div>
                <button class="btn-select-tier" data-tier="basic">Select Basic Plan</button>
            </div>
        `;
    }

    renderPremiumTier() {
        return `
            <div class="tier-card premium-tier" data-tier="premium">
                <div class="tier-badge">MOST POPULAR</div>
                <div class="tier-header">
                    <h3>Premium Plan with Rita</h3>
                    <div class="price">$25<span>/user/month</span></div>
                    <p class="price-note">After 30-day free trial</p>
                </div>
                <div class="tier-features">
                    <div class="feature-item">
                        <span class="check">✅</span>
                        <span>Everything in Basic Plan</span>
                    </div>
                    <div class="feature-item">
                        <span class="check">✅</span>
                        <span>Rita AI Service Desk Agent</span>
                    </div>
                    <div class="feature-item">
                        <span class="check">✅</span>
                        <span>Automated workflow creation</span>
                    </div>
                </div>
                <div class="benefits-box premium">
                    <h5>🤖 Rita AI Capabilities:</h5>
                    <div class="benefit-item">
                        <span class="icon">🎯</span>
                        <span>Rita automatically builds up to 3 workflows</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">💬</span>
                        <span>24/7 intelligent ticket resolution</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">🧠</span>
                        <span>Learns from your knowledge base</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">⚡</span>
                        <span>Real-time automation execution</span>
                    </div>
                    <div class="benefit-item">
                        <span class="icon">📊</span>
                        <span>Advanced performance analytics</span>
                    </div>
                </div>
                <button class="btn-select-tier premium" data-tier="premium">Select Premium Plan</button>
            </div>
        `;
    }

    attachEventListeners() {
        const buttons = this.container.querySelectorAll('.btn-select-tier');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tier = e.target.dataset.tier;
                this.selectTier(tier);
            });
        });
    }

    selectTier(tier) {
        this.selectedTier = tier;
        
        // Update visual state
        const cards = this.container.querySelectorAll('.tier-card');
        cards.forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = this.container.querySelector(`.tier-card[data-tier="${tier}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Callback with selected tier
        if (this.onSelectPlan) {
            setTimeout(() => {
                this.onSelectPlan(tier);
            }, 500);
        }
    }

    getSelectedTier() {
        return this.selectedTier;
    }
}