/**
 * Turn State Utilities
 *
 * Utilities for managing turn completion state in multi-part AI responses.
 * The turn_complete field signals when the AI has finished sending all messages
 * for a given turn, enabling proper loading indicator management.
 */

import type { Message, GroupedChatMessage } from '@/stores/conversationStore';

/**
 * Check if a message group is complete (no more messages coming)
 *
 * @param messages - Array of messages in a group (sorted by timestamp)
 * @returns true if the last message has turn_complete=true, false otherwise
 *
 * @example
 * const messages = conversationStore.messages.filter(m => m.response_group_id === groupId);
 * const isComplete = isMessageGroupComplete(messages);
 * if (!isComplete) {
 *   // Show loading spinner
 * }
 */
export function isMessageGroupComplete(messages: Message[]): boolean {
  if (messages.length === 0) return true;

  const lastMessage = messages[messages.length - 1];
  return lastMessage.metadata?.turn_complete ?? false;
}

/**
 * Check if a grouped chat message is complete
 *
 * @param groupedMessage - A grouped chat message with multiple parts
 * @returns true if the last part has turn_complete=true, false otherwise
 *
 * @example
 * const isComplete = isGroupedMessageComplete(chatMessage);
 * if (!isComplete) {
 *   // Show "AI is typing..." indicator
 * }
 */
export function isGroupedMessageComplete(groupedMessage: GroupedChatMessage): boolean {
  if (groupedMessage.parts.length === 0) return true;

  const lastPart = groupedMessage.parts[groupedMessage.parts.length - 1];
  return lastPart.metadata?.turn_complete ?? false;
}

/**
 * Check if the conversation is waiting for more messages
 *
 * @param messages - All messages in the conversation
 * @returns true if the last assistant message is incomplete
 *
 * @example
 * const messages = conversationStore.messages;
 * const isWaiting = isWaitingForMoreMessages(messages);
 * // Use to show global "AI is working..." state
 */
export function isWaitingForMoreMessages(messages: Message[]): boolean {
  if (messages.length === 0) return false;

  const lastMessage = messages[messages.length - 1];

  // Only check assistant messages
  if (lastMessage.role !== 'assistant') return false;

  // If turn_complete is explicitly false or undefined, we're waiting
  return !lastMessage.metadata?.turn_complete;
}

/**
 * Get the completion status for a specific response group
 *
 * @param messages - All messages in the conversation
 * @param responseGroupId - The response group ID to check
 * @returns 'complete' | 'incomplete' | 'unknown'
 *
 * @example
 * const status = getResponseGroupStatus(messages, 'group-123');
 * if (status === 'incomplete') {
 *   // Show loading indicator for this specific group
 * }
 */
export function getResponseGroupStatus(
  messages: Message[],
  responseGroupId: string
): 'complete' | 'incomplete' | 'unknown' {
  const groupMessages = messages.filter(m => m.response_group_id === responseGroupId);

  if (groupMessages.length === 0) return 'unknown';

  const lastMessage = groupMessages[groupMessages.length - 1];
  const turnComplete = lastMessage.metadata?.turn_complete;

  if (turnComplete === true) return 'complete';
  if (turnComplete === false) return 'incomplete';
  return 'unknown';
}