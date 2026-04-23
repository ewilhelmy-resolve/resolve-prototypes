/**
 * Health check for all services required by e2e validation.
 *
 * Checks: PostgreSQL, RabbitMQ, Valkey, Keycloak, Mailpit, API server, Client dev server.
 *
 * Usage: pnpm e2e:check
 *   or:  tsx scripts/e2e/health-check.ts
 */

interface CheckResult {
	name: string;
	ok: boolean;
	detail: string;
}

async function checkPostgres(): Promise<CheckResult> {
	const dbUrl =
		process.env.DATABASE_URL ||
		"postgresql://rita:rita@localhost:5432/onboarding";
	try {
		const url = new URL(dbUrl);
		const net = await import("node:net");
		await new Promise<void>((resolve, reject) => {
			const socket = net.createConnection(
				{ host: url.hostname, port: parseInt(url.port || "5432") },
				() => {
					socket.end();
					resolve();
				},
			);
			socket.on("error", reject);
			socket.setTimeout(3000, () => {
				socket.end();
				reject(new Error("timeout"));
			});
		});
		return {
			name: "PostgreSQL",
			ok: true,
			detail: `${url.hostname}:${url.port}`,
		};
	} catch (err) {
		return { name: "PostgreSQL", ok: false, detail: (err as Error).message };
	}
}

async function checkRabbitMQ(): Promise<CheckResult> {
	const rabbitUrl =
		process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
	try {
		const url = new URL(rabbitUrl);
		const host = url.hostname || "localhost";
		const user = url.username || "guest";
		const pass = url.password || "guest";
		const auth = Buffer.from(`${user}:${pass}`).toString("base64");

		const res = await fetch(`http://${host}:15672/api/overview`, {
			headers: { Authorization: `Basic ${auth}` },
			signal: AbortSignal.timeout(3000),
		});
		if (res.ok) {
			const data = (await res.json()) as { rabbitmq_version?: string };
			return {
				name: "RabbitMQ",
				ok: true,
				detail: `v${data.rabbitmq_version || "?"}`,
			};
		}
		return { name: "RabbitMQ", ok: false, detail: `HTTP ${res.status}` };
	} catch (err) {
		return { name: "RabbitMQ", ok: false, detail: (err as Error).message };
	}
}

async function checkValkey(): Promise<CheckResult> {
	const valkeyUrl =
		process.env.VALKEY_URL || process.env.REDIS_URL || "redis://localhost:6379";
	try {
		const url = new URL(valkeyUrl);
		const host = url.hostname || "localhost";
		const port = parseInt(url.port || "6379", 10);

		const net = await import("node:net");
		const response = await new Promise<string>((resolve, reject) => {
			const socket = net.createConnection({ host, port }, () => {
				socket.write("PING\r\n");
			});
			socket.on("data", (data) => {
				const res = data.toString().trim();
				socket.end();
				resolve(res);
			});
			socket.on("error", reject);
			socket.setTimeout(3000, () => {
				socket.end();
				reject(new Error("timeout"));
			});
		});

		return {
			name: "Valkey",
			ok: response === "+PONG",
			detail: response === "+PONG" ? `${host}:${port}` : response,
		};
	} catch (err) {
		return { name: "Valkey", ok: false, detail: (err as Error).message };
	}
}

async function checkKeycloak(): Promise<CheckResult> {
	const kcUrl = process.env.KEYCLOAK_URL || "http://localhost:8080";
	const realm = process.env.KEYCLOAK_REALM || "rita-chat-realm";
	try {
		const res = await fetch(`${kcUrl}/realms/${realm}`, {
			signal: AbortSignal.timeout(5000),
		});
		if (res.ok) {
			return { name: "Keycloak", ok: true, detail: `${kcUrl} (${realm})` };
		}
		return { name: "Keycloak", ok: false, detail: `HTTP ${res.status}` };
	} catch (err) {
		return { name: "Keycloak", ok: false, detail: (err as Error).message };
	}
}

async function checkApiServer(): Promise<CheckResult> {
	const apiUrl = process.env.VITE_API_URL || "http://localhost:3000";
	try {
		// Try common health endpoints
		for (const path of ["/health", "/api/health", "/"]) {
			try {
				const res = await fetch(`${apiUrl}${path}`, {
					signal: AbortSignal.timeout(3000),
				});
				if (res.ok || res.status === 404) {
					// 404 means server is up, just no health endpoint at that path
					return { name: "API Server", ok: true, detail: `${apiUrl}` };
				}
			} catch {
				// try next path
			}
		}
		return { name: "API Server", ok: false, detail: "No response" };
	} catch (err) {
		return { name: "API Server", ok: false, detail: (err as Error).message };
	}
}

async function checkClient(): Promise<CheckResult> {
	const clientUrl = "http://localhost:5173";
	try {
		const res = await fetch(clientUrl, {
			signal: AbortSignal.timeout(3000),
		});
		return {
			name: "Client",
			ok: res.ok,
			detail: res.ok ? clientUrl : `HTTP ${res.status}`,
		};
	} catch (err) {
		return { name: "Client", ok: false, detail: (err as Error).message };
	}
}

async function checkMailpit(): Promise<CheckResult> {
	const mailpitUrl = "http://localhost:8025";
	try {
		const res = await fetch(`${mailpitUrl}/api/v1/info`, {
			signal: AbortSignal.timeout(3000),
		});
		if (res.ok) {
			const data = (await res.json()) as {
				Version?: string;
				Messages?: number;
			};
			return {
				name: "Mailpit",
				ok: true,
				detail: `${mailpitUrl} (${data.Messages ?? 0} messages)`,
			};
		}
		return { name: "Mailpit", ok: false, detail: `HTTP ${res.status}` };
	} catch (err) {
		return { name: "Mailpit", ok: false, detail: (err as Error).message };
	}
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
	console.log("🔍 Checking e2e services...\n");

	const results = await Promise.all([
		checkPostgres(),
		checkRabbitMQ(),
		checkValkey(),
		checkKeycloak(),
		checkApiServer(),
		checkClient(),
		checkMailpit(),
	]);

	const maxNameLen = Math.max(...results.map((r) => r.name.length));

	for (const r of results) {
		const icon = r.ok ? "✅" : "❌";
		const name = r.name.padEnd(maxNameLen);
		console.log(`  ${icon} ${name}  ${r.detail}`);
	}

	const allOk = results.every((r) => r.ok);
	const failCount = results.filter((r) => !r.ok).length;

	console.log("");
	if (allOk) {
		console.log("✅ All services are running. Ready for e2e validation.");
	} else {
		console.log(`❌ ${failCount} service(s) not available.`);
		console.log("   Run: pnpm dev  (starts full stack)");
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Health check failed:", err);
	process.exit(1);
});
