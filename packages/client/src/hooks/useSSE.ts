import { useCallback, useEffect, useRef, useState } from "react";
import {
	EventSourceSSEClient,
	type SSEEvent,
} from "../services/EventSourceSSEClient";

export interface UseSSEOptions {
	url: string;
	onMessage?: (event: SSEEvent) => void;
	onError?: (error: any) => void;
	onOpen?: () => void;
	onClose?: () => void;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
	enabled?: boolean;
}

export const useSSE = ({
	url,
	onMessage,
	onError,
	onOpen,
	onClose,
	reconnectInterval = 3000, // TODO: implement reconnection logic
	maxReconnectAttempts = 10, // TODO: implement max attempts
	enabled = true,
}: UseSSEOptions) => {
	const clientRef = useRef<EventSourceSSEClient | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [reconnectAttempts, setReconnectAttempts] = useState(0); // TODO: implement reconnection tracking

	// Suppress unused variable warnings for future features
	void reconnectInterval;
	void maxReconnectAttempts;
	void reconnectAttempts;

	const connect = useCallback(async () => {
		if (!enabled) return;

		try {
			if (!clientRef.current) {
				clientRef.current = new EventSourceSSEClient({
					url,
				});

				// Set up event listeners
				clientRef.current.on("open", () => {
					setIsConnected(true);
					setReconnectAttempts(0);
					onOpen?.();
				});

				clientRef.current.on("message", (data: SSEEvent) => {
					onMessage?.(data);
				});

				clientRef.current.on("error", (error: any) => {
					setIsConnected(false);
					onError?.(error);
				});

				clientRef.current.on("close", () => {
					setIsConnected(false);
					onClose?.();
				});
			}

			await clientRef.current.connect();
		} catch (error) {
			console.error("Failed to connect to SSE:", error);
			onError?.(error);
		}
	}, [url, enabled, onMessage, onError, onOpen, onClose]);

	const disconnect = useCallback(() => {
		if (clientRef.current) {
			clientRef.current.disconnect();
			clientRef.current = null;
		}
		setIsConnected(false);
	}, []);

	const reconnect = useCallback(() => {
		if (clientRef.current) {
			clientRef.current.reconnect();
		} else {
			connect();
		}
	}, [connect]);

	useEffect(() => {
		if (enabled) {
			connect();
		} else {
			disconnect();
		}

		return () => {
			disconnect();
		};
	}, [enabled, connect, disconnect]);

	return {
		connect,
		disconnect,
		reconnect,
		isConnected,
	};
};
