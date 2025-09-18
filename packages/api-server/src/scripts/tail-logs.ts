import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, watchFile, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFile = resolve(__dirname, '../../../logs/app.log');

let lastSize = 0;

function tailLog() {
  try {
    const stats = statSync(logFile);
    const currentSize = stats.size;

    if (currentSize > lastSize) {
      // Read only the new content
      const content = readFileSync(logFile, 'utf8');
      const newContent = content.slice(lastSize);

      if (newContent.trim()) {
        console.log(newContent.trim());
      }

      lastSize = currentSize;
    }
  } catch (error) {
    console.error('Error reading log file:', error instanceof Error ? error.message : String(error));
  }
}

console.log(`📋 Tailing log file: ${logFile}`);
console.log('Press Ctrl+C to stop\n');

// Initial read
tailLog();

// Watch for changes
watchFile(logFile, { interval: 1000 }, () => {
  tailLog();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopped tailing logs');
  process.exit(0);
});