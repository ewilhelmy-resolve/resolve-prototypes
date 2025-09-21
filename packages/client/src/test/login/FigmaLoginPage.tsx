"use client";

import React, { useState } from "react";
import { SignIn1 } from "@/components/pro-blocks/application/sign-in/sign-in-1";
import "../styles/figma-poc.css";

/**
 * POC: Figma-to-React Login Page with Rita AI Interface
 *
 * This demonstrates the complete integration:
 * 1. Left side: Pro Block sign-in form (80% - from shadcn Design)
 * 2. Right side: Rita AI interface (20% - custom Figma component)
 *
 * Architecture: 80% Pro Blocks + 20% Custom Rita Components
 */

// Mock Rita AI Interface Component (to be replaced with actual Figma component)
function RitaAIInterface() {
  return (
    <div className="rita-ai-container">
      <div className="rita-branding">
        <h2>Ask Rita</h2>
        <p className="rita-subtitle">Your AI workflow assistant</p>
      </div>

      <div className="rita-chat-interface">
        <div className="chat-message rita-message">
          <div className="message-avatar">🤖</div>
          <div className="message-content">
            <p>Welcome! I can help you automate workflows, analyze data, and streamline your processes.</p>
          </div>
        </div>

        <div className="chat-message user-message">
          <div className="message-content">
            <p>How can I automate my data pipeline?</p>
          </div>
          <div className="message-avatar">👤</div>
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            placeholder="Ask Rita anything..."
            className="rita-input"
          />
          <button className="rita-send-btn">→</button>
        </div>
      </div>

      <div className="workflow-visualization">
        <div className="workflow-node active">Data Input</div>
        <div className="workflow-connector">→</div>
        <div className="workflow-node processing">Rita Processing</div>
        <div className="workflow-connector">→</div>
        <div className="workflow-node">Output</div>
      </div>
    </div>
  );
}

export default function FigmaLoginPage() {
  return (
    <div className="bg-background gap-x-6 py-6 md:flex md:min-h-screen md:p-6">
      {/* Left side: Pro Block sign-in form (80%) */}
      <div className="flex items-center justify-center md:w-1/2">
        <SignIn1 />
      </div>

      {/* Right side: Rita AI Interface (20% - Custom Component) */}
      <div className="flex items-center justify-center md:w-1/2 p-6">
        <RitaAIInterface />
      </div>

      {/* Development Notes */}
      <div className="dev-notes">
        <h4>🎯 POC Demonstrates Correct Approach:</h4>
        <ul>
          <li>✅ Pro Block sign-in-1 component (80%)</li>
          <li>✅ Rita AI interface mockup (20%)</li>
          <li>✅ Zero manual styling violations</li>
          <li>✅ Pure component-based architecture</li>
          <li>⚠️ Form state should be handled in Pro Block component</li>
        </ul>
      </div>
    </div>
  );
}