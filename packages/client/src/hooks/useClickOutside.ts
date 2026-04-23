import { type RefObject, useEffect } from "react";

/**
 * Hook that calls a handler when a click occurs outside the referenced element.
 */
export function useClickOutside(
	ref: RefObject<HTMLElement | null>,
	handler: () => void,
) {
	useEffect(() => {
		function onMouseDown(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				handler();
			}
		}

		document.addEventListener("mousedown", onMouseDown);
		return () => document.removeEventListener("mousedown", onMouseDown);
	}, [ref, handler]);
}
