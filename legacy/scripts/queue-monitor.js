#!/usr/bin/env node

const axios = require('axios');

class QueueMonitor {
    constructor() {
        this.rabbitUrl = 'http://localhost:15672/api';
        this.auth = { username: 'admin', password: 'admin' };
        this.isRunning = false;
    }

    async getQueueStats() {
        try {
            const response = await axios.get(`${this.rabbitUrl}/queues`, { auth: this.auth });
            return response.data.filter(q => q.name !== '');
        } catch (error) {
            throw new Error(`Failed to get queue stats: ${error.message}`);
        }
    }

    async getExchangeStats() {
        try {
            const response = await axios.get(`${this.rabbitUrl}/exchanges`, { auth: this.auth });
            return response.data.filter(e => e.name !== '');
        } catch (error) {
            throw new Error(`Failed to get exchange stats: ${error.message}`);
        }
    }

    async getConnectionStats() {
        try {
            const response = await axios.get(`${this.rabbitUrl}/connections`, { auth: this.auth });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get connection stats: ${error.message}`);
        }
    }

    formatQueueStats(queues) {
        console.log('\n📊 Queue Statistics:');
        console.log('─'.repeat(80));
        console.log('Queue Name'.padEnd(25) + 'Messages'.padEnd(12) + 'Consumers'.padEnd(12) + 'Rate'.padEnd(15) + 'State');
        console.log('─'.repeat(80));

        const chatQueues = queues.filter(q => q.name.includes('chat') || q.name.includes('document') || q.name.includes('failed'));
        
        chatQueues.forEach(queue => {
            const name = queue.name.padEnd(25);
            const messages = queue.messages.toString().padEnd(12);
            const consumers = queue.consumers.toString().padEnd(12);
            const rate = (queue.message_stats?.publish_details?.rate || 0).toFixed(2).padEnd(15);
            const state = queue.state || 'running';
            
            console.log(`${name}${messages}${consumers}${rate}${state}`);
        });
    }

    formatConnectionStats(connections) {
        console.log('\n🔗 Connection Statistics:');
        console.log('─'.repeat(60));
        console.log('Client'.padEnd(30) + 'State'.padEnd(15) + 'Channels');
        console.log('─'.repeat(60));

        connections.forEach(conn => {
            const client = (conn.client_properties?.application || 'Unknown').padEnd(30);
            const state = conn.state.padEnd(15);
            const channels = conn.channels.toString();
            
            console.log(`${client}${state}${channels}`);
        });
    }

    async printSnapshot() {
        try {
            const [queues, connections] = await Promise.all([
                this.getQueueStats(),
                this.getConnectionStats()
            ]);

            console.clear();
            console.log('🐰 RabbitMQ Queue Monitor');
            console.log(`📅 ${new Date().toLocaleString()}`);
            
            this.formatQueueStats(queues);
            this.formatConnectionStats(connections);

            // Alert on issues
            const failedMessages = queues.find(q => q.name === 'failed.messages');
            if (failedMessages && failedMessages.messages > 0) {
                console.log(`\n🚨 WARNING: ${failedMessages.messages} messages in dead letter queue!`);
            }

            const busyQueues = queues.filter(q => q.messages > 10);
            if (busyQueues.length > 0) {
                console.log(`\n⚠️  NOTICE: ${busyQueues.length} queues have >10 pending messages`);
            }

        } catch (error) {
            console.error('❌ Monitor error:', error.message);
        }
    }

    async startMonitoring(intervalSeconds = 5) {
        this.isRunning = true;
        console.log(`🎯 Starting queue monitor (updating every ${intervalSeconds}s)`);
        console.log('📊 Management UI: http://localhost:15672');
        console.log('🛑 Press Ctrl+C to stop\n');

        // Initial snapshot
        await this.printSnapshot();

        // Periodic updates
        this.interval = setInterval(async () => {
            if (this.isRunning) {
                await this.printSnapshot();
            }
        }, intervalSeconds * 1000);
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
        }
        console.log('\n👋 Queue monitor stopped');
        process.exit(0);
    }
}

// CLI usage
const monitor = new QueueMonitor();

process.on('SIGINT', () => monitor.stop());
process.on('SIGTERM', () => monitor.stop());

// Parse command line arguments
const args = process.argv.slice(2);
const intervalSeconds = args[0] ? parseInt(args[0]) : 5;

if (isNaN(intervalSeconds) || intervalSeconds < 1) {
    console.error('Usage: node queue-monitor.js [interval_seconds]');
    console.error('Example: node queue-monitor.js 3');
    process.exit(1);
}

monitor.startMonitoring(intervalSeconds).catch(error => {
    console.error('Failed to start monitor:', error.message);
    process.exit(1);
});