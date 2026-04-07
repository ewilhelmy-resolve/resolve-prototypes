import { useEffect, useState } from "react";

/**
 * Returns a debounced version of the input value.
 * The returned value only updates after the specified delay
 * has passed without the input value changing.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
