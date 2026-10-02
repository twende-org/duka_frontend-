import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after it has stayed unchanged
 * for `delayMs`. Used to keep server-backed search from firing on every
 * keystroke while the instant local results keep rendering.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
