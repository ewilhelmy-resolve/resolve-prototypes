/**
 * conversationStore.test.ts - Unit tests for message grouping and reasoning merging
 *
 * Focus: High-value tests for the reasoning message merging feature.
 * Tests the core `groupMessages()` function which handles both grouped and standalone messages.
 */

import { describe, it, expect } from 'vitest'
import { groupMessages, type Message, type GroupedChatMessage } from './conversationStore'

describe('conversationStore - Reasoning Message Merging', () => {
  /**
   * Test: Basic consecutive reasoning messages merge into one
   * Value: Ensures core merging functionality works
   */
  describe('Basic Reasoning Merging', () => {
    it('should merge 2 consecutive reasoning-only messages', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: {
            reasoning: {
              content: 'First thought process',
              title: 'Planning',
            },
          },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: {
            reasoning: {
              content: 'Second thought process',
              title: 'Analysis',
            },
          },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      expect(grouped.parts).toHaveLength(1)
      expect(grouped.parts[0].metadata.reasoning.content).toBe(
        'First thought process\n\nSecond thought process'
      )
      expect(grouped.parts[0].metadata.reasoning.title).toBe('Analysis') // Last title wins
    })

    it('should merge 3+ consecutive reasoning messages', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Step 1', title: 'Planning' } },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Step 2', title: 'Analysis' } },
        },
        {
          id: 'msg-3',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:02Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Step 3', title: 'Verification' } },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      expect(grouped.parts[0].metadata.reasoning.content).toBe('Step 1\n\nStep 2\n\nStep 3')
      expect(grouped.parts[0].metadata.reasoning.title).toBe('Verification')
    })
  })

  /**
   * Test: Reasoning merges into message with text
   * Value: Critical for the reasoning → text merging feature
   */
  describe('Reasoning + Text Merging', () => {
    it('should merge reasoning-only into reasoning+text message', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Planning approach', title: 'Planning' } },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Analyzing data', title: 'Analysis' } },
        },
        {
          id: 'msg-3',
          role: 'assistant',
          message: 'Here is the final answer',
          timestamp: new Date('2025-01-01T00:00:02Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Final verification', title: 'Verification' } },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      const part = grouped.parts[0]
      expect(part.id).toBe('msg-3') // Uses last message's ID
      expect(part.message).toBe('Here is the final answer')
      expect(part.metadata.reasoning.content).toBe(
        'Planning approach\n\nAnalyzing data\n\nFinal verification'
      )
      expect(part.metadata.reasoning.title).toBe('Verification')
    })
  })

  /**
   * Test: Non-reasoning messages interrupt merging
   * Value: Ensures merge stops correctly at boundaries
   */
  describe('Merge Boundary Conditions', () => {
    it('should NOT merge reasoning separated by non-reasoning text', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'First reasoning' } },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: 'Interrupting text without reasoning',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
        },
        {
          id: 'msg-3',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:02Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Second reasoning' } },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      // Should have 3 separate parts (not merged)
      expect(grouped.parts).toHaveLength(3)
      expect(grouped.parts[0].metadata.reasoning.content).toBe('First reasoning')
      expect(grouped.parts[1].message).toBe('Interrupting text without reasoning')
      expect(grouped.parts[2].metadata.reasoning.content).toBe('Second reasoning')
    })
  })

  /**
   * Test: Sources preservation during merging
   * Value: Ensures metadata isn't lost during merge
   */
  describe('Metadata Preservation', () => {
    it('should preserve sources when merging reasoning', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: {
            reasoning: { content: 'Researching docs' },
            sources: [{ url: 'https://docs.example.com', title: 'Docs' }],
          },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Continuing analysis' } },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      const part = grouped.parts[0]
      expect(part.metadata.reasoning.content).toBe('Researching docs\n\nContinuing analysis')
      expect(part.metadata.sources).toEqual([
        { url: 'https://docs.example.com', title: 'Docs' },
      ])
    })

    it('should use last message as base when it has text content', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: {
            reasoning: { content: 'First' },
            sources: [{ url: 'https://first.com', title: 'First' }],
          },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: 'Answer with different metadata',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: {
            reasoning: { content: 'Second' },
            tasks: [{ title: 'Task', items: ['Item 1'] }],
          },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      const part = grouped.parts[0]
      expect(part.id).toBe('msg-2') // Last message as base
      expect(part.message).toBe('Answer with different metadata')
      expect(part.metadata.sources).toBeUndefined()
      expect(part.metadata.tasks).toEqual([{ title: 'Task', items: ['Item 1'] }])
    })
  })

  /**
   * Test: Standalone message merging
   * Value: Ensures standalone (non-grouped) messages also merge
   */
  describe('Standalone Message Merging', () => {
    it('should merge consecutive standalone reasoning messages', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          // No response_group_id - standalone
          metadata: { reasoning: { content: 'Standalone reasoning 1' } },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          // No response_group_id - standalone
          metadata: { reasoning: { content: 'Standalone reasoning 2' } },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      expect(grouped.parts[0].metadata.reasoning.content).toBe(
        'Standalone reasoning 1\n\nStandalone reasoning 2'
      )
    })
  })

  /**
   * Test: Edge cases
   * Value: Ensures robustness
   */
  describe('Edge Cases', () => {
    it('should handle empty message array', () => {
      const result = groupMessages([])
      expect(result).toEqual([])
    })

    it('should handle single reasoning message without merging', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          message: '',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'completed',
          response_group_id: 'group-1',
          metadata: { reasoning: { content: 'Single reasoning' } },
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].isGroup).toBe(true)

      const grouped = result[0] as GroupedChatMessage
      expect(grouped.parts).toHaveLength(1)
      expect(grouped.parts[0].metadata.reasoning.content).toBe('Single reasoning')
    })

    it('should handle messages without metadata', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          message: 'User question',
          timestamp: new Date('2025-01-01T00:00:00Z'),
          conversation_id: 'conv-1',
          status: 'sent',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          message: 'Simple text response',
          timestamp: new Date('2025-01-01T00:00:01Z'),
          conversation_id: 'conv-1',
          status: 'completed',
        },
      ]

      const result = groupMessages(messages)

      expect(result).toHaveLength(2)
      expect(result[0].isGroup).toBe(false)
      expect(result[1].isGroup).toBe(false)
    })
  })
})
