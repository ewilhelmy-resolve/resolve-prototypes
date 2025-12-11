# Reasoning Message Merging - Design Document

## Status

**✅ IMPLEMENTED** - All functionality complete, 10/10 unit tests passing

## Overview

This document describes the design for merging consecutive reasoning messages into a single reasoning component, creating a streaming experience where reasoning content appears to continuously expand rather than stacking multiple separate blocks.

**Primary Goal:** From the user perspective, consecutive reasoning messages are confusing. Users expect them to collapse into one unified thinking block.

## Implementation Summary

**Files Modified:**
- `src/stores/conversationStore.ts` - Added merging logic
- `src/stores/conversationStore.test.ts` - Added 10 unit tests (all passing)

**Key Functions:**
- `hasReasoning()` - Helper to detect messages with reasoning metadata
- `mergeConsecutiveReasoning()` - Core merging algorithm
- `groupMessages()` - Refactored to use two-pass approach with merging support

**What Works:**
- ✅ Consecutive reasoning messages merge into one block
- ✅ Works for both grouped messages and standalone messages
- ✅ Reasoning content concatenates with double newlines
- ✅ Last message's title and streaming state are used
- ✅ Metadata (sources, tasks, files) preserved correctly
- ✅ Non-reasoning messages interrupt merging as expected
- ✅ All 10 unit tests passing

## Problem Statement

**Current Behavior:**
When the AI backend sends multiple reasoning messages via SSE (Server-Sent Events), each message with `metadata.reasoning` creates a separate `<Reasoning>` collapsible block in the UI.

Example:
```
┌─ Reasoning ────────────────┐
│ Planning the approach...   │
└────────────────────────────┘

┌─ Reasoning ────────────────┐
│ Analyzing requirements...  │
└────────────────────────────┘

┌─ Reasoning ────────────────┐
│ Considering edge cases...  │
└────────────────────────────┘
```

**Desired Behavior:**
Consecutive reasoning-only messages should merge into a single expanding block:

```
┌─ Reasoning ────────────────┐
│ Planning the approach...   │
│                            │
│ Analyzing requirements...  │
│                            │
│ Considering edge cases...  │
└────────────────────────────┘
```

## Requirements

### Functional Requirements

1. **FR-1: Reasoning-Only Detection**
   - A message qualifies as "reasoning-only" if:
     - Has `metadata.reasoning` property
     - Has empty or whitespace-only `message` field
     - Does NOT have other metadata: `sources`, `tasks`, or `files`

2. **FR-2: Consecutive Reasoning Merging**
   - **Reasoning-only sequences:** Consecutive reasoning-only messages merge into one
   - **Reasoning → Reasoning+Text:** Reasoning-only messages merge INTO the next message's reasoning if it also has reasoning
   - **Merging scope:** Works both within groups AND across standalone messages
   - **Stop condition:** Merging stops when a message has NO reasoning metadata

3. **FR-3: Content Concatenation**
   - Reasoning content should concatenate with double newlines (`\n\n`)
   - Preserves readability and paragraph separation

4. **FR-4: Title Handling**
   - Use the **last** reasoning message's title
   - Rationale: Represents the most recent/current thinking phase
   - If last message has no title, fall back to default "Thinking..."

5. **FR-5: Streaming State**
   - Use the **last** reasoning message's `streaming` boolean
   - Ensures UI shows correct streaming indicator

6. **FR-6: Transparent Merging**
   - No visual indicator of merged messages
   - Users see a single continuous reasoning block
   - Seamless streaming experience

### Non-Functional Requirements

1. **NFR-1: Performance**
   - Merging should be O(n) where n = number of parts in a group
   - No impact on message rendering performance

2. **NFR-2: Backward Compatibility**
   - Existing messages without reasoning remain unaffected
   - Mixed content messages (reasoning + text) remain separate

3. **NFR-3: Audit Trail**
   - Track original message IDs that were merged (optional for future audit logging)

## Design

### Architecture

**Location:** `/packages/client/src/stores/conversationStore.ts`

**Entry Point:** The `groupMessages()` function processes all messages and calls `mergeConsecutiveReasoning()` for both grouped messages and standalone messages.

### Data Flow

```
Backend SSE Stream
       ↓
Message[] (flat storage)
       ↓
groupMessages() function
       ↓
  ├─ For grouped messages (with response_group_id):
  │    ↓
  │  mergeConsecutiveReasoning() ← NEW FUNCTION
  │    ↓
  │  GroupedChatMessage with merged reasoning
  │
  └─ For standalone messages (no response_group_id):
       ↓
     mergeConsecutiveReasoning() ← NEW FUNCTION
       ↓
     SimpleChatMessage or GroupedChatMessage (if has metadata)
       ↓
ChatV1Content rendering
       ↓
Single <Reasoning> component
```

### Algorithm

#### Helper Functions

**Function: `hasReasoning()`**

```typescript
/**
 * Check if a message part has any reasoning metadata
 *
 * @param part - Message part to check
 * @returns true if part has reasoning (regardless of other content)
 */
function hasReasoning(part: { message: string; metadata?: any }): boolean {
  return Boolean(part.metadata?.reasoning)
}
```

#### Main Function: `mergeConsecutiveReasoning()`

```typescript
/**
 * Merge consecutive reasoning messages into single reasoning blocks
 *
 * Merging rules:
 * 1. Consecutive reasoning-only messages → merge into one
 * 2. Reasoning-only → Reasoning+Text → merge reasoning content into the text message's reasoning
 * 3. Stop merging when a message has NO reasoning metadata
 *
 * @param parts - Array of message parts
 * @returns Array with merged reasoning parts
 *
 * @example
 * // Example 1: All reasoning-only
 * Input:
 * [
 *   { id: '1', message: '', metadata: { reasoning: { content: 'A' } } },
 *   { id: '2', message: '', metadata: { reasoning: { content: 'B' } } }
 * ]
 * Output:
 * [
 *   { id: '1', message: '', metadata: { reasoning: { content: 'A\n\nB' } } }
 * ]
 *
 * @example
 * // Example 2: Reasoning-only → Reasoning+Text
 * Input:
 * [
 *   { id: '1', message: '', metadata: { reasoning: { content: 'Planning...' } } },
 *   { id: '2', message: '', metadata: { reasoning: { content: 'Analyzing...' } } },
 *   { id: '3', message: 'Answer', metadata: { reasoning: { content: 'Final thought' } } }
 * ]
 * Output:
 * [
 *   { id: '3', message: 'Answer', metadata: { reasoning: { content: 'Planning...\n\nAnalyzing...\n\nFinal thought' } } }
 * ]
 */
function mergeConsecutiveReasoning(
  parts: Array<{ id: string; message: string; metadata?: any }>
): Array<{ id: string; message: string; metadata?: any }> {
  if (parts.length === 0) return parts

  const merged: Array<{ id: string; message: string; metadata?: any }> = []
  let i = 0

  while (i < parts.length) {
    const currentPart = parts[i]

    // If no reasoning at all, add as-is and continue
    if (!hasReasoning(currentPart)) {
      merged.push(currentPart)
      i++
      continue
    }

    // Found part with reasoning - collect all consecutive parts with reasoning
    const reasoningParts = [currentPart]
    let j = i + 1

    while (j < parts.length && hasReasoning(parts[j])) {
      reasoningParts.push(parts[j])
      j++
    }

    // Merge all reasoning content
    const mergedReasoningContent = reasoningParts
      .map(part => part.metadata!.reasoning!.content)
      .join('\n\n')

    // Use last part's title and streaming state
    const lastPart = reasoningParts[reasoningParts.length - 1]
    const lastReasoning = lastPart.metadata!.reasoning!

    // Determine which part to use as base:
    // - If last part has text content or other metadata → use last part
    // - Otherwise → use first part
    const hasTextOrMetadata =
      (lastPart.message && lastPart.message.trim().length > 0) ||
      lastPart.metadata?.sources ||
      lastPart.metadata?.tasks ||
      lastPart.metadata?.files

    const basePart = hasTextOrMetadata ? lastPart : reasoningParts[0]

    // Create merged part
    merged.push({
      id: basePart.id,
      message: basePart.message,
      metadata: {
        ...basePart.metadata,
        reasoning: {
          content: mergedReasoningContent,
          title: lastReasoning.title,
          duration: lastReasoning.duration,
          streaming: lastReasoning.streaming,
        }
      }
    })

    // Skip all merged parts
    i = j
  }

  return merged
}
```

#### Integration: Update `groupMessages()`

The `groupMessages()` function has been refactored to use a simplified two-pass approach:

**Pass 1: Collection**
- Iterate through all messages
- Collect grouped messages (with `response_group_id`) into a `Map`
- Collect standalone messages separately

**Pass 2: Processing with merging**
- Use a `while` loop with index tracking to process messages in order
- For grouped messages:
  - Sort by timestamp
  - Convert to parts
  - Call `mergeConsecutiveReasoning(parts)`
  - Create `GroupedChatMessage`
- For standalone messages:
  - Collect ALL consecutive standalone messages
  - Convert to parts
  - Call `mergeConsecutiveReasoning(parts)`
  - Create `SimpleChatMessage` (if no metadata) or `GroupedChatMessage` (if has metadata)

This approach ensures:
- Proper message ordering (respects original flatMessages order)
- Consecutive standalone messages are collected and merged together
- Groups are processed once, with all messages collected first
- No double-processing or missed messages

## Examples

### Example 1: Basic Consecutive Reasoning

**Input Messages:**
```typescript
[
  {
    id: 'msg-1',
    response_group_id: 'group-1',
    message: '',
    metadata: {
      reasoning: {
        content: 'First, I need to understand the requirements.',
        title: 'Planning'
      }
    }
  },
  {
    id: 'msg-2',
    response_group_id: 'group-1',
    message: '',
    metadata: {
      reasoning: {
        content: 'Now analyzing the data structure.',
        title: 'Analysis'
      }
    }
  },
  {
    id: 'msg-3',
    response_group_id: 'group-1',
    message: 'Based on my analysis, here is the solution...',
    metadata: null
  }
]
```

**Output GroupedChatMessage:**
```typescript
{
  id: 'group-1',
  role: 'assistant',
  isGroup: true,
  parts: [
    {
      id: 'msg-1',
      message: '',
      metadata: {
        reasoning: {
          content: 'First, I need to understand the requirements.\n\nNow analyzing the data structure.',
          title: 'Analysis',  // Last title wins
          streaming: false
        }
      }
    },
    {
      id: 'msg-3',
      message: 'Based on my analysis, here is the solution...',
      metadata: null
    }
  ]
}
```

### Example 2: Reasoning-Only → Reasoning+Text (Merge Into Text Message)

**Input Messages:**
```typescript
[
  {
    id: 'msg-1',
    response_group_id: 'group-1',
    message: '',
    metadata: { reasoning: { content: 'Planning the approach...', title: 'Planning' } }
  },
  {
    id: 'msg-2',
    response_group_id: 'group-1',
    message: '',
    metadata: { reasoning: { content: 'Analyzing requirements...', title: 'Analysis' } }
  },
  {
    id: 'msg-3',
    response_group_id: 'group-1',
    message: 'Based on my analysis, here is the solution...',
    metadata: { reasoning: { content: 'Final verification complete.', title: 'Verification' } }
  }
]
```

**Output:** Single part with merged reasoning + text
```typescript
{
  id: 'group-1',
  role: 'assistant',
  isGroup: true,
  parts: [
    {
      id: 'msg-3',  // Uses last part's ID (has text content)
      message: 'Based on my analysis, here is the solution...',
      metadata: {
        reasoning: {
          content: 'Planning the approach...\n\nAnalyzing requirements...\n\nFinal verification complete.',
          title: 'Verification',  // Last title
          streaming: false
        }
      }
    }
  ]
}
```

### Example 3: Reasoning Interrupted by Non-Reasoning Text

**Input Messages:**
```typescript
[
  {
    id: 'msg-1',
    response_group_id: 'group-1',
    message: '',
    metadata: { reasoning: { content: 'Thinking about approach A...' } }
  },
  {
    id: 'msg-2',
    response_group_id: 'group-1',
    message: 'Let me explain the first part.',  // NO reasoning
    metadata: null
  },
  {
    id: 'msg-3',
    response_group_id: 'group-1',
    message: '',
    metadata: { reasoning: { content: 'Now considering approach B...' } }
  }
]
```

**Output:** 2 separate parts (reasoning sequences separated by non-reasoning message)
```typescript
parts: [
  {
    id: 'msg-1',
    message: '',
    metadata: { reasoning: { content: 'Thinking about approach A...' } }
  },
  {
    id: 'msg-2',
    message: 'Let me explain the first part.',
    metadata: null
  },
  {
    id: 'msg-3',
    message: '',
    metadata: { reasoning: { content: 'Now considering approach B...' } }
  }
]
```

### Example 4: Reasoning with Sources

**Input Messages:**
```typescript
[
  {
    id: 'msg-1',
    response_group_id: 'group-1',
    message: '',
    metadata: {
      reasoning: { content: 'Researching documentation...' },
      sources: [{ url: 'https://docs.example.com', title: 'Docs' }]
    }
  },
  {
    id: 'msg-2',
    response_group_id: 'group-1',
    message: '',
    metadata: { reasoning: { content: 'Continuing analysis...' } }
  }
]
```

**Output:** Single merged part (reasoning merged, sources preserved)
```typescript
parts: [
  {
    id: 'msg-1',  // Uses first part (has sources)
    message: '',
    metadata: {
      reasoning: {
        content: 'Researching documentation...\n\nContinuing analysis...'  // MERGED
      },
      sources: [...]  // PRESERVED
    }
  }
]
```

**Explanation:** Both messages have reasoning, so they merge. The first message has sources, so we keep it as the base and preserve all its metadata.

## Edge Cases

| Case | Behavior |
|------|----------|
| Single reasoning message | No merge, rendered as-is |
| All reasoning messages | All merged into one |
| Empty reasoning content | Treated as reasoning-only, merged normally |
| No title in any message | Uses default "Thinking..." title |
| Title only in first message | Uses default title (last message has no title) |
| Different streaming states | Uses last message's streaming state |
| Whitespace-only message | Treated as empty (reasoning-only) |

## Testing Strategy

### Unit Tests

**Location:** `/packages/client/src/stores/conversationStore.test.ts`

All tests are implemented and passing (10/10):

1. **Basic Reasoning Merging**
   - ✅ Merges 2 consecutive reasoning-only messages
   - ✅ Merges 3+ consecutive reasoning messages

2. **Reasoning + Text Merging**
   - ✅ Merges reasoning-only into reasoning+text message

3. **Merge Boundary Conditions**
   - ✅ Does NOT merge reasoning separated by non-reasoning text

4. **Metadata Preservation**
   - ✅ Preserves sources when merging reasoning
   - ✅ Uses last message as base when it has text content

5. **Standalone Message Merging**
   - ✅ Merges consecutive standalone reasoning messages

6. **Edge Cases**
   - ✅ Handles empty message array
   - ✅ Handles single reasoning message without merging
   - ✅ Handles messages without metadata

**Test Results:**
```
 ✓ src/stores/conversationStore.test.ts (10 tests) 12ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

### Manual Testing

1. **Test: SSE Streaming Experience**
   - Start conversation with reasoning-heavy query
   - Observe reasoning block expanding (not stacking)
   - Verify smooth streaming animation

2. **Test: Mixed Content Response**
   - Reasoning → Text → Reasoning
   - Verify reasoning blocks separated by text

3. **Test: Reasoning with Sources**
   - Reasoning + Sources → Pure Reasoning
   - Verify first block NOT merged with second

## Implementation Plan

1. ✅ Create design document (this file)
2. ✅ Add `hasReasoning()` helper function
3. ✅ Add `mergeConsecutiveReasoning()` function
4. ✅ Refactor `groupMessages()` to use two-pass approach with merging
5. ✅ Add unit tests for merging logic (10 tests, all passing)
6. ✅ Add integration tests for `groupMessages()`
7. ⬜ Manual testing with SSE streaming
8. ⬜ Code review and refinement

**Implementation Complete:** All core functionality and unit tests are implemented and passing.

## Future Enhancements

1. **Audit Logging** - Track merged message IDs for SOC2 compliance
2. **Title History** - Show all titles as breadcrumb (e.g., "Planning → Analysis → Validation")
3. **Progressive Disclosure** - Collapse older reasoning sections, expand latest
4. **Animated Transitions** - Smooth height animation when content appends

## Decisions Made

1. ✅ **Q:** Should we preserve all titles or just the last one?
   - **A:** Use last title only (simplest, represents current phase)

2. ✅ **Q:** What defines messages that should merge?
   - **A:** ANY message with `metadata.reasoning`, regardless of other content. We use `hasReasoning()` to detect this, not `isReasoningOnly()`. This allows merging of:
     - Reasoning-only messages (empty text)
     - Reasoning + text messages
     - Reasoning + sources messages

3. ✅ **Q:** Should standalone reasoning messages (not in groups) also merge if consecutive?
   - **A:** YES - this is the primary goal of the feature

4. ✅ **Q:** Should we show a visual indicator that reasoning was merged?
   - **A:** NO - transparent merge, users see unified thinking block

5. ✅ **Q:** What happens with reasoning-only → reasoning+text?
   - **A:** Merge reasoning content INTO the text message's reasoning block, using the last message as the base (preserves text and metadata)

6. ✅ **Q:** How should we handle message ordering with mixed grouped/standalone messages?
   - **A:** Use two-pass approach: first collect all messages by type, then process in original order using a while loop with index tracking

## References

- **Original Code:** `/packages/client/src/stores/conversationStore.ts`
- **Rendering:** `/packages/client/src/components/chat/ChatV1Content.tsx` (lines 159-271)
- **Related Issue:** N/A (proactive improvement)