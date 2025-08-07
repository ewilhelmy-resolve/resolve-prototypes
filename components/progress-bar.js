export class ProgressBar {
    constructor(containerId, totalSteps) {
        this.container = document.getElementById(containerId);
        this.totalSteps = totalSteps;
        this.currentStep = 1;
        this.init();
    }

    init() {
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" id="progressBar"></div>
            </div>
        `;
        this.progressFill = this.container.querySelector('.progress-fill');
        this.update();
    }

    update() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        this.progressFill.style.width = progress + '%';
    }

    setStep(step) {
        this.currentStep = step;
        this.update();
    }

    next() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.update();
        }
    }

    previous() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.update();
        }
    }
}