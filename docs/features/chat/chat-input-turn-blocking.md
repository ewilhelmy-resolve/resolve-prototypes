# Chat Input Turn Blocking - Design Document

## Status

**✅ IMPLEMENTED** - Core functionality complete, ready for testing

## Overview

This document describes the design for blocking user input during AI response generation to enforce turn-based conversation flow and prevent message queue conflicts.

**Primary Goal:** Prevent users from sending multiple messages while the AI is processing/streaming a response, creating a clear turn-based conversation pattern.

## Problem Statement

**Current Behavior:**
Users can send multiple messages while the AI is still generating a response. This can lead to:
- Confusion about which message the AI is responding to
- Potential backend race conditions with SSE streaming
- Poor UX when users accidentally interrupt reasoning/thinking
- Message queue complexity

**Desired Behavior:**
- Input is enabled: User can type and send messages
- User sends message: Input immediately disabled
- AI is responding: Input remains disabled, user sees visual feedback
- Turn complete: Input re-enabled, user can send next message

## Requirements

### Functional Requirements

1. **FR-1: Input Blocking on Send**
   - When user sends a message, immediately disable the textarea and submit button
   - Block state persists until AI turn is complete

2. **FR-2: Turn Detection**
   - Turn is considered "in progress" when:
     - `chatStatus === "submitted"` (user just sent message)
     - `chatStatus === "streaming"` (AI is responding)
   - Turn is "complete" when:
     - `chatStatus === "ready"` (AI finished, no pending messages)

3. **FR-3: Submit Button State**
   - Disabled during turn (streaming/submitted)
   - Disabled when input is empty (existing behavior preserved)
   - Shows appropriate status indicator

4. **FR-4: Textarea State**
   - Disabled during turn (streaming/submitted)
   - Visual indication that input is blocked (handled by browser default)

5. **FR-5: Error Handling**
   - If last message status is `"failed"`, re-enable input
   - User can retry sending message after error

### Non-Functional Requirements

1. **NFR-1: Performance**
   - No performance impact on typing or rendering
   - State changes should be instant

2. **NFR-2: Accessibility**
   - Disabled state must be accessible (ARIA attributes handled by HTML disabled)
   - Screen readers should announce state changes (future enhancement)

3. **NFR-3: Backward Compatibility**
   - Existing chat functionality remains unchanged
   - No breaking changes to message flow

## Design

### Architecture

**Location:** `/packages/client/src/components/chat/ChatV1Content.tsx`

**Entry Point:** Modify `PromptInput` textarea and submit button to respond to `chatStatus`

### Chat Status States

The existing `mapRitaStatusToChatStatus()` function already provides the necessary states:

| Status | Meaning | Input State |
|--------|---------|-------------|
| `"submitted"` | User just sent message or file uploading | **Disabled** |
| `"streaming"` | AI is processing/responding | **Disabled** |
| `"error"` | Last message failed | **Enabled** (allow retry) |
| `"ready"` | Conversation idle, ready for input | **Enabled** |

### Implementation Strategy

#### 1. Disable Condition Logic

```typescript
const isInputDisabled =
  chatStatus === "streaming" ||
  chatStatus === "submitted";
```

#### 2. Component Updates

**Textarea:**
```tsx
<PromptInputTextarea
  onChange={(e) => handleMessageChange(e.target.value)}
  value={messageValue}
  placeholder="Ask me anything..."
  disabled={isInputDisabled}  // NEW
/>
```

**Submit Button:**
```tsx
<PromptInputSubmit
  disabled={
    !messageValue.trim() ||           // Empty input (existing)
    chatStatus === "streaming" ||     // NEW: Disable during streaming
    chatStatus === "submitted"        // NEW: Disable after submit
  }
  status={chatStatus}
/>
```

### User Experience Flow

```
User types message
       ↓
User clicks Send/Enter
       ↓
Input immediately disabled ← chatStatus = "submitted"
       ↓
Backend processes message
       ↓
SSE stream starts ← chatStatus = "streaming"
       ↓
AI sends reasoning messages (input still disabled)
       ↓
AI sends final response with turn_complete: true
       ↓
chatStatus = "ready"
       ↓
Input re-enabled ← User can send next message
```

### Edge Cases

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| SSE connection drops | Input stays disabled until timeout/error | Prevents duplicate sends, requires backend fix |
| Message fails (status: "failed") | Input re-enabled | User can retry |
| Empty message | Submit disabled (existing behavior) | Prevents empty sends |
| File upload in progress | Input disabled via `uploadStatus.isUploading` | Already handled by `chatStatus = "submitted"` |
| User navigates away during streaming | State resets on page load | Standard behavior |

### Error Handling & Timeouts

**Current Implementation:**
- `chatStatus` automatically returns to `"ready"` when no messages are processing
- If message fails, `chatStatus = "error"` which doesn't block input
- Relies on backend SSE `turn_complete` signal

**Future Enhancement (Not in Scope):**
- Client-side timeout after 60 seconds of streaming
- Automatic re-enable with error message
- "Connection lost" detection

## Implementation Plan

1. ✅ Create design document (this file)
2. ✅ Add `isInputDisabled` derived state (line 386-387)
3. ✅ Update `PromptInputTextarea` with `disabled` prop (line 544)
4. ✅ Update `PromptInputSubmit` disabled condition (lines 565-569)
5. ⬜ Manual testing of turn-based flow
6. ⬜ Test error scenarios (failed messages)
7. ⬜ Code review and refinement

**Implementation Complete:** All code changes implemented in `ChatV1Content.tsx`

## Future Enhancements

### Phase 2: Improved Loading States (Companion Feature)

**Problem:** Current loading indicator is a separate spinner at the bottom of the conversation, which is disconnected from the actual streaming content and doesn't clearly show where the AI is working.

**Proposed Solution:** Replace bottom spinner with in-message streaming indicators

#### Design Options Considered

**Option 1: Typing Indicator in Last Message ⭐ (Recommended)**
```
┌─ Assistant ────────────────┐
│ Here's my analysis...      │
│                            │
│ ● ● ●  (animated dots)     │
└────────────────────────────┘
```
- Shows AI is "typing more" in the same message
- Natural continuation of streaming content
- Familiar pattern (iMessage, Slack, WhatsApp)
- Clear connection between loading state and content

**Option 2: Pulsing/Animated Border**
- Add subtle pulse or shimmer effect to last message border
- Very elegant and subtle
- Doesn't add UI elements

**Option 3: Streaming Text Cursor**
```
Here's my analysis...|  (blinking cursor)
```
- Mimics real typing experience
- Very clear indicator
- Can be distracting during long responses

**Option 4: Skeleton Loading**
```
┌─ Assistant ────────────────┐
│ Here's my analysis...      │
│                            │
│ ▓▓▓▓▓▓▓░░░░░ (shimmer)     │
│ ▓▓▓▓░░░░░░░                │
└────────────────────────────┘
```
- Shows "content is coming"
- Modern loading pattern
- Can be jarring when content replaces skeleton

#### Recommended Implementation: Hybrid Approach

**Combine Options 1 + 2:**

1. **During Reasoning Streaming:**
   ```tsx
   <Reasoning isStreaming={true}>  // ← Already supported!
     <ReasoningTrigger title="Thinking..." />
     <ReasoningContent>
       Content here...
     </ReasoningContent>
   </Reasoning>
   ```
   - The `Reasoning` component already supports `isStreaming` prop
   - Shows indicator in the reasoning UI
   - Add subtle pulse to reasoning border

2. **During Text Response Streaming:**
   ```tsx
   <MessageContent className={cn(
     isLastAssistantMessage && isStreaming && "animate-pulse-border"
   )}>
     <Response>{part.message}</Response>
     {isLastPart && isStreaming && (
       <span className="inline-flex gap-1 ml-2">
         <span className="animate-bounce">●</span>
         <span className="animate-bounce delay-100">●</span>
         <span className="animate-bounce delay-200">●</span>
       </span>
     )}
   </MessageContent>
   ```

3. **Keep Spinners for Initial States:**
   - Initial conversation load (center spinner) - OK as is
   - Pagination load (top spinner with text) - OK as is
   - **Remove** bottom spinner, replace with in-message indicators

#### Implementation Requirements

**Detection Logic:**
```typescript
// Detect if message is last assistant message
const isLastAssistantMessage = (messageId: string) => {
  const lastMessage = chatMessages[chatMessages.length - 1];
  return lastMessage?.id === messageId && lastMessage.role === 'assistant';
};

// Detect if message is currently streaming
const isMessageStreaming = (message: RitaMessage) => {
  return message.status === 'processing' || message.status === 'pending';
};
```

**Component Changes:**
- Update `GroupedMessage` to detect last part and show typing indicator
- Update `SimpleMessage` to show typing indicator when streaming
- Add CSS animations for bouncing dots and pulse border
- Remove `<Loader />` from lines 510-513 in ChatV1Content.tsx

**Visual Design:**
```css
/* Bouncing dot animations */
.animate-bounce { animation: bounce 1s infinite; }
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }

/* Pulse border for active message */
.animate-pulse-border {
  animation: pulse-border 2s ease-in-out infinite;
  border-color: rgba(59, 130, 246, 0.5);
}

@keyframes pulse-border {
  0%, 100% { border-color: rgba(59, 130, 246, 0.3); }
  50% { border-color: rgba(59, 130, 246, 0.7); }
}
```

#### Benefits

- ✅ **Better Context:** Users see where new content will appear
- ✅ **Reduced Cognitive Load:** No separate loading indicator to track
- ✅ **Familiar Pattern:** Matches chat app conventions
- ✅ **Works with Reasoning:** Leverage existing `isStreaming` prop
- ✅ **Elegant:** Subtle but clear visual feedback

#### Implementation Effort

- **Estimated Time:** 1-2 hours
- **Complexity:** Medium (requires per-message streaming detection)
- **Dependencies:** None (uses existing infrastructure)
- **Breaking Changes:** None (removes spinner, adds in-message indicators)

### Phase 3: Input Visual Feedback

1. **Dynamic Placeholder Text**
   ```tsx
   placeholder={
     chatStatus === "streaming" || chatStatus === "submitted"
       ? "Rita is responding..."
       : "Ask me anything..."
   }
   ```

2. **Status Indicator**
   - Show "Rita is thinking..." text below input
   - Animated dots or pulse effect
   - Estimated time remaining (if available)

3. **Border Animation**
   - Subtle pulse or gradient animation on disabled input
   - Visual cue that system is active

### Phase 4: Stop Generation (Future)

**Blocked by:** Backend doesn't support stopping SSE streams yet

Once backend supports it:
- Replace submit button with "Stop generating" button during streaming
- Send stop signal to backend
- Re-enable input immediately
- Standard pattern in modern AI chat UIs

### Phase 5: Message Queuing (Advanced)

**Possible Enhancement:**
- Allow users to type follow-up message while AI responds
- Show "pending message" indicator
- Auto-send when turn completes
- Requires careful UX design to avoid confusion

## Testing Strategy

### Manual Testing Checklist

1. **Basic Turn Blocking**
   - [ ] Send message, verify input immediately disabled
   - [ ] Wait for AI response, verify input re-enabled when complete
   - [ ] Try clicking send button while disabled (should not submit)

2. **Multi-Part Responses**
   - [ ] Send message that triggers reasoning
   - [ ] Verify input stays disabled through all reasoning messages
   - [ ] Verify input re-enabled only after final message with `turn_complete: true`

3. **Error Scenarios**
   - [ ] Trigger failed message, verify input re-enabled
   - [ ] Test with network disconnection
   - [ ] Verify input doesn't stay disabled forever

4. **File Upload**
   - [ ] Upload file, verify input disabled during upload
   - [ ] Verify input stays disabled during AI response
   - [ ] Verify input re-enabled after response complete

5. **Edge Cases**
   - [ ] Empty input stays disabled (existing behavior)
   - [ ] Typing in disabled state (should not accept input)
   - [ ] Keyboard shortcuts while disabled

### Accessibility Testing

1. **Keyboard Navigation**
   - [ ] Tab to textarea while disabled (should skip or show disabled state)
   - [ ] Enter key while disabled (should not submit)

2. **Screen Reader**
   - [ ] Screen reader announces disabled state (browser default)
   - [ ] Future: Announce when input re-enabled

## Decisions Made

1. ✅ **Q:** Should we add a "Stop generating" button?
   - **A:** No, backend doesn't support stopping SSE streams yet. Future enhancement.

2. ✅ **Q:** Should we add visual feedback (placeholder change, animations)?
   - **A:** Not in initial implementation. Phase 2 enhancement.

3. ✅ **Q:** What if SSE connection drops and input stays disabled?
   - **A:** Accept this limitation for now. Backend fix required. Future: client-side timeout.

4. ✅ **Q:** Should we allow typing (but not sending) during AI response?
   - **A:** No, fully disable textarea for simplicity and clarity.

5. ✅ **Q:** How do we handle failed messages?
   - **A:** `chatStatus === "error"` doesn't block input, user can retry immediately.

6. ✅ **Q:** Should we block input during file upload?
   - **A:** Yes, already handled via `chatStatus === "submitted"` when `uploadStatus.isUploading === true`.

## References

- **Main Component:** `/packages/client/src/components/chat/ChatV1Content.tsx`
- **Chat Status Logic:** Lines 91-139 (`mapRitaStatusToChatStatus`)
- **Input Components:** Lines 536-563 (PromptInput)
- **Related Issue:** RG-197 (reasoning grouping - related feature)

## Implementation Summary

**Files to Modify:**
- `src/components/chat/ChatV1Content.tsx` - Add disabled state to input components

**Lines to Change:**
- ~Line 536: Add `disabled` prop to `PromptInputTextarea`
- ~Line 559: Update `disabled` condition for `PromptInputSubmit`

**Estimated Effort:** 15 minutes (implementation) + 30 minutes (testing)

**Breaking Changes:** None

**Dependencies:** None (uses existing `chatStatus` logic)