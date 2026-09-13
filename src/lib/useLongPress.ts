import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";

/**
 * Long-press recognition for pointer devices (touch + mouse).
 * Fires `callback` after `delay` ms unless the pointer is released or moves
 * more than a few pixels first. Suppresses the click that follows a fired
 * long-press so it does not also trigger the tap action.
 */
export function useLongPress(callback: () => void, delay = 450) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        callback();
      }, delay);
    },
    [callback, delay],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const from = origin.current;
      if (!from) {
        return;
      }
      if (Math.abs(event.clientX - from.x) > 10 || Math.abs(event.clientY - from.y) > 10) {
        cancel();
      }
    },
    [cancel],
  );

  const onClickCapture = useCallback((event: SyntheticEvent) => {
    if (fired.current) {
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    cancel,
    props: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onClickCapture,
    },
  };
}
