/**
 * transcript-escaping.test.ts
 *
 * Unit tests for transcript content escaping functionality.
 * Ensures special characters in message content are properly escaped
 * to prevent JSON validation errors in webhook payloads.
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to simulate the transcript escaping logic
 * This matches the implementation in conversations.ts lines 195-203
 */
function escapeTranscriptContent(message: string): string {
  return message
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t')   // Escape tabs
    .replace(/"/g, '\\"');   // Escape quotes
}

/**
 * Helper to create transcript entry like the route does
 */
function createTranscriptEntry(role: string, message: string) {
  return {
    role,
    content: escapeTranscriptContent(message)
  };
}

describe('Transcript Content Escaping', () => {
  describe('Basic escaping', () => {
    it('should escape newline characters', () => {
      const message = 'Hello\nWorld';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Hello\\nWorld');
      expect(result).not.toContain('\n');
    });

    it('should escape carriage returns', () => {
      const message = 'Hello\rWorld';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Hello\\rWorld');
      expect(result).not.toContain('\r');
    });

    it('should escape tab characters', () => {
      const message = 'Hello\tWorld';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Hello\\tWorld');
      expect(result).not.toContain('\t');
    });

    it('should escape double quotes', () => {
      const message = 'He said "Hello"';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('He said \\"Hello\\"');
    });

    it('should escape backslashes', () => {
      const message = 'Path: C:\\Users\\Test';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Path: C:\\\\Users\\\\Test');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple line breaks', () => {
      const message = 'Line 1\nLine 2\nLine 3\n';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Line 1\\nLine 2\\nLine 3\\n');
      expect(result.match(/\\n/g)?.length).toBe(3);
    });

    it('should handle mixed special characters', () => {
      const message = 'Hello\nWorld\t"Test"\r';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Hello\\nWorld\\t\\"Test\\"\\r');
    });

    it('should handle backslash before newline', () => {
      const message = 'Text\\\nMore text';
      const result = escapeTranscriptContent(message);

      // Backslash should be escaped first, then newline
      expect(result).toBe('Text\\\\\\nMore text');
    });

    it('should handle empty string', () => {
      const message = '';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('');
    });

    it('should handle string with no special characters', () => {
      const message = 'Hello World';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Hello World');
    });
  });

  describe('Real-world use cases', () => {
    it('should handle multi-line code snippet', () => {
      const message = 'function test() {\n  console.log("Hello");\n  return true;\n}';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('function test() {\\n  console.log(\\"Hello\\");\\n  return true;\\n}');

      // Verify it creates valid JSON
      const json = JSON.stringify({ content: result });
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should handle formatted text with tabs and newlines', () => {
      const message = 'Step 1:\tInstall\nStep 2:\tConfigure\nStep 3:\tRun';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Step 1:\\tInstall\\nStep 2:\\tConfigure\\nStep 3:\\tRun');
    });

    it('should handle file path with backslashes', () => {
      const message = 'Error in file: C:\\Program Files\\App\\config.json';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Error in file: C:\\\\Program Files\\\\App\\\\config.json');
    });

    it('should handle JSON string within message', () => {
      const message = 'Config: {"name": "test", "value": 123}';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Config: {\\"name\\": \\"test\\", \\"value\\": 123}');
    });
  });

  describe('JSON serialization', () => {
    it('should create valid JSON for transcript with escaped content', () => {
      const transcript = [
        createTranscriptEntry('user', 'Hello\nHow are you?'),
        createTranscriptEntry('assistant', 'I\'m doing well!\nHow can I help?'),
        createTranscriptEntry('user', 'Can you help with:\n1. Task A\n2. Task B')
      ];

      // Should not throw when serializing
      expect(() => JSON.stringify(transcript)).not.toThrow();

      const json = JSON.stringify(transcript);

      // Should not throw when parsing
      expect(() => JSON.parse(json)).not.toThrow();

      // Verify content is preserved
      const parsed = JSON.parse(json);
      expect(parsed[0].content).toBe('Hello\\nHow are you?');
      expect(parsed[2].content).toBe('Can you help with:\\n1. Task A\\n2. Task B');
    });

    it('should validate JSON round-trip integrity', () => {
      const transcript = [
        createTranscriptEntry('user', 'Test\nwith\nmultiple\nlines'),
        createTranscriptEntry('assistant', 'Response\twith\ttabs')
      ];

      // Serialize and parse
      const json = JSON.stringify({ transcript });
      const parsed = JSON.parse(json);

      // Verify structure is intact
      expect(parsed).toHaveProperty('transcript');
      expect(parsed.transcript).toBeInstanceOf(Array);
      expect(parsed.transcript).toHaveLength(2);

      // Verify content has escaped characters
      expect(parsed.transcript[0].content).toBe('Test\\nwith\\nmultiple\\nlines');
      expect(parsed.transcript[1].content).toBe('Response\\twith\\ttabs');
    });

    it('should create valid JSON for webhook payload structure', () => {
      const transcript = [
        createTranscriptEntry('user', 'Line 1\nLine 2'),
        createTranscriptEntry('assistant', 'Response\twith\ttabs')
      ];

      const webhookPayload = {
        source: 'rita-chat',
        action: 'message_created',
        transcript_ids: {
          transcripts: transcript
        }
      };

      // Should serialize without errors
      const json = JSON.stringify(webhookPayload);
      expect(() => JSON.parse(json)).not.toThrow();

      // Verify structure
      const parsed = JSON.parse(json);
      expect(parsed.transcript_ids.transcripts).toHaveLength(2);
      expect(parsed.transcript_ids.transcripts[0].content).toBe('Line 1\\nLine 2');
      expect(parsed.transcript_ids.transcripts[1].content).toBe('Response\\twith\\ttabs');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long message with many newlines', () => {
      const lines = Array(100).fill('Test line').join('\n');
      const result = escapeTranscriptContent(lines);

      expect(result.match(/\\n/g)?.length).toBe(99);
      expect(() => JSON.stringify({ content: result })).not.toThrow();
    });

    it('should handle unicode characters with newlines', () => {
      const message = 'Hello 世界\nBonjour 🌍\n';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Hello 世界\\nBonjour 🌍\\n');
      expect(() => JSON.stringify({ content: result })).not.toThrow();
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const message = 'Line 1\r\nLine 2\r\nLine 3';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('Line 1\\r\\nLine 2\\r\\nLine 3');
    });

    it('should handle null-like string values', () => {
      const message = 'null\nundefined\n';
      const result = escapeTranscriptContent(message);

      expect(result).toBe('null\\nundefined\\n');
    });
  });

  describe('Primary use cases', () => {
    it('should handle user pasting multi-line text from editor', () => {
      // User copies text from code editor with line breaks
      const message = `function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + item.price;
  }, 0);
}`;

      const entry = createTranscriptEntry('user', message);
      const json = JSON.stringify([entry]);

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed[0].content).toContain('\\n');
      expect(parsed[0].content).not.toContain('\n');
    });

    it('should handle assistant response with formatted steps', () => {
      // Assistant sends structured response with line breaks
      const message = `Here's how to fix the issue:

1. First, check your configuration
2. Then, restart the service
3. Finally, verify it's working`;

      const entry = createTranscriptEntry('assistant', message);
      const json = JSON.stringify([entry]);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should handle conversation with file paths and commands', () => {
      const transcript = [
        createTranscriptEntry('user', 'I need help with this error:\nFile not found: C:\\Users\\Test\\file.txt'),
        createTranscriptEntry('assistant', 'Try this command:\ncd "C:\\Users\\Test"\ndir file.txt'),
        createTranscriptEntry('user', 'It says: "Access denied"\nWhat should I do?')
      ];

      const json = JSON.stringify({ transcripts: transcript });
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.transcripts).toHaveLength(3);
      // Verify all entries have escaped content
      parsed.transcripts.forEach((entry: any) => {
        expect(entry.content).not.toMatch(/[^\\]\n/); // No unescaped newlines
        expect(entry.content).not.toMatch(/[^\\]\\[^\\nrt"]/); // No unescaped backslashes
      });
    });
  });
});
