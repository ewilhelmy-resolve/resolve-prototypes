import { createContext, type ReactNode, useContext } from "react";
import type { ConnectionSource } from "@/constants/connectionSources";

interface ConnectionSourceContextType {
	source: ConnectionSource;
}

const ConnectionSourceContext =
	createContext<ConnectionSourceContextType | null>(null);

interface ConnectionSourceProviderProps {
	source: ConnectionSource;
	children: ReactNode;
}

export function ConnectionSourceProvider({
	source,
	children,
}: ConnectionSourceProviderProps) {
	return (
		<ConnectionSourceContext.Provider value={{ source }}>
			{children}
		</ConnectionSourceContext.Provider>
	);
}

export function useConnectionSource() {
	const context = useContext(ConnectionSourceContext);
	if (!context) {
		throw new Error(
			"useConnectionSource must be used within a ConnectionSourceProvider",
		);
	}
	return context;
}
