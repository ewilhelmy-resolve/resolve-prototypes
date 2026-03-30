import { useCallback, useEffect, useRef, useState } from "react";

interface UseControllableStateParams<T> {
	prop?: T;
	defaultProp?: T;
	onChange?: (value: T) => void;
}

function useControllableState<T>({
	prop,
	defaultProp,
	onChange,
}: UseControllableStateParams<T>) {
	const [uncontrolledValue, setUncontrolledValue] = useState<T>(
		defaultProp as T,
	);
	const isControlled = prop !== undefined;
	const value = (isControlled ? prop : uncontrolledValue) as T;
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const setValue = useCallback(
		(nextValue: T | ((prev: T | undefined) => T)) => {
			if (isControlled) {
				const newValue =
					typeof nextValue === "function"
						? (nextValue as (prev: T | undefined) => T)(prop)
						: nextValue;
				if (newValue !== prop) {
					onChangeRef.current?.(newValue);
				}
			} else {
				setUncontrolledValue(nextValue as T);
			}
		},
		[isControlled, prop],
	);

	return [value, setValue] as const;
}

export { useControllableState };
