"use client";

import { useRef, type PointerEvent } from "react";

const LONG_PRESS_MS = 500;

/**
 * Tap runs `onTap`, holding for half a second runs `onLongPress` instead (SPEC 7: counter
 * −1, stacking exact value). Keyboard users get the tap through the button's click.
 */
export function useLongPress(onTap: () => void, onLongPress?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const firedLongPress = useRef(false);

  const clear = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };

  return {
    onPointerDown: (event: PointerEvent) => {
      if (!onLongPress || event.button !== 0) {
        return;
      }
      firedLongPress.current = false;
      timer.current = setTimeout(() => {
        firedLongPress.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Suppress the browser menu a long press opens on touch devices.
    onContextMenu: (event: PointerEvent | React.MouseEvent) => {
      if (onLongPress) {
        event.preventDefault();
      }
    },
    onClick: () => {
      if (firedLongPress.current) {
        firedLongPress.current = false;
        return;
      }
      onTap();
    },
  };
}
