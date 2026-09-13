import { useState, type ReactNode } from "react";
import { useDrag } from "@use-gesture/react";
import { Trash2 } from "lucide-react";

/**
 * Touch-only horizontal swipe that reveals a delete affordance behind the
 * content. Releasing past the threshold (or a fast flick in either
 * direction) fires `onDelete` — the content always snaps back, so deletion
 * itself is left to the caller's confirmation flow.
 *
 * `onDragActivity` is called as soon as intentional movement is detected,
 * so callers can cancel competing gestures (e.g. long-press) that would
 * otherwise fire during a slow swipe.
 */
export function Swipeable({
  onDelete,
  onDragActivity,
  children,
}: {
  onDelete: () => void;
  onDragActivity?: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const bind = useDrag(
    ({ down, movement: [mx, my], swipe: [swipeX] }) => {
      setSwiping(down);
      if (down) {
        if (Math.abs(mx) > 2 || Math.abs(my) > 2) {
          onDragActivity?.();
        }
        setOffset(Math.max(-96, Math.min(96, mx)));
        return;
      }
      setOffset(0);
      if (swipeX !== 0 || Math.abs(mx) >= 72) {
        onDelete();
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
      swipe: { distance: 40, velocity: 0.25 },
    },
  );

  return (
    <div className="swipeable">
      <div
        className="swipeable-bg"
        aria-hidden="true"
        style={{ justifyContent: offset > 0 ? "flex-start" : "flex-end" }}
      >
        <Trash2 size={18} />
      </div>
      <div
        className="swipeable-content"
        {...bind()}
        style={{
          transform: offset === 0 ? undefined : `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 180ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
