"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "../styles/figma-poc.css";

/**
 * POC: Legacy HTML → React Migration with Figma Workflow
 *
 * This replicates the legacy onboarding form using:
 * 1. Pro Blocks where available (buttons, inputs)
 * 2. Provisional React components for Rita-specific elements
 * 3. Clean swappable architecture for future Figma components
 *
 * Components marked as PROVISIONAL will be replaced by UX-generated Figma components
 */

// PROVISIONAL: To be replaced with Figma component from UX
function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <div className="step-badge">
      Step {step} of {total}
    </div>
  );
}

// PROVISIONAL: To be replaced with Figma component from UX
function RitaWorkflowBackground() {
  const workflowNodes = [
    "Trigger",
    "if-Else-if Else",
    "ActionName",
    "ActionName",
    "Trigger"
  ];

  return (
    <div className="workflow-background">
      {workflowNodes.map((nodeName, index) => (
        <div key={index} className="workflow-node">
          <span className="node-text">{nodeName}</span>
          <div className="node-toggle"></div>
        </div>
      ))}
    </div>
  );
}

// PROVISIONAL: To be replaced with Figma component from UX
function RitaChatInterface() {
  return (
    <div className="rita-chat-container">
      <div className="rita-chat-content">
        <div className="rita-header">
          <h2 className="rita-title">Ask Rita</h2>
          <p className="rita-subtitle">How can I help you today?</p>
        </div>
        <div className="rita-input-area">
          <input
            type="text"
            className="rita-input"
            placeholder="Message Rita..."
            disabled
          />
          <button className="rita-send-button" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// PROVISIONAL: To be replaced with Figma component from UX
function ValidationModal({ isOpen, message, onClose }: {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Required Information</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <p style={{textAlign: 'center'}}>{message}</p>
        </div>
        <div className="modal-footer">
          <Button onClick={onClose} className="modal-button">OK</Button>
        </div>
      </div>
    </div>
  );
}

export default function FigmaLoginPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { fullName, email, company, password } = formData;

    if (!fullName || !email || !company || !password) {
      setModalMessage('Please fill in all required fields.');
      setShowModal(true);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalMessage('Please enter a valid email address.');
      setShowModal(true);
      return false;
    }

    if (password.length < 6) {
      setModalMessage('Password must be at least 6 characters long.');
      setShowModal(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Simulate API call
    setModalMessage('Registration successful! (Demo mode)');
    setShowModal(true);
  };

  return (
    <div className="onboarding-container">
      {/* Left Column: Onboarding Form */}
      <div className="form-section">
        <div className="form-container">
          <div className="step-header">
            <StepBadge step={1} total={2} />
            <div className="header-text">
              <h1 className="main-heading">Start your automation journey</h1>
              <p>Take 2 minutes to share your goals and challenges with IT automation.</p>
            </div>
          </div>

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="fullName">Full name</label>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="First and last name"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Work email</label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="you@acme.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="company">Company name</label>
              <Input
                type="text"
                id="company"
                name="company"
                placeholder="Acme"
                value={formData.company}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="nav-buttons">
              <div className="signin-link">
                <span>Already have an account?</span>
                <a href="/login">Sign in here</a>
              </div>
              <Button type="submit" variant="outline">Continue</Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Rita Graphics */}
      <div className="graphic-section">
        <RitaWorkflowBackground />
        <div className="rita-container">
          <RitaChatInterface />
        </div>
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showModal}
        message={modalMessage}
        onClose={() => setShowModal(false)}
      />

      {/* Development Notes */}
      <div className="dev-notes">
        <h4>🎯 Legacy → React Migration Status:</h4>
        <ul>
          <li>✅ Pro Blocks: Button, Input components</li>
          <li>⏳ PROVISIONAL: StepBadge (awaiting UX Figma component)</li>
          <li>⏳ PROVISIONAL: RitaWorkflowBackground (awaiting UX Figma component)</li>
          <li>⏳ PROVISIONAL: RitaChatInterface (awaiting UX Figma component)</li>
          <li>⏳ PROVISIONAL: ValidationModal (awaiting UX Figma component)</li>
          <li>✅ Form validation and state management working</li>
        </ul>
        <p><strong>Next:</strong> UX provides Figma components via CLI for clean replacement</p>
      </div>
    </div>
  );
}