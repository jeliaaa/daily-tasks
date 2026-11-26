"use client";

import { clampSplit, DEFAULT_SPLIT, MAX_SPLIT, MIN_SPLIT } from "./layout-pref";

const STEP = 5;

/**
 * Draggable divider between the two columns. Its parent must be the grid holding both
 * of them. Arrow keys resize too, and a double click goes back to 50/50.
 */
export function SplitHandle({
  split,
  onChange,
  className,
}: {
  split: number;
  onChange: (split: number) => void;
  className: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the To do and Done columns"
      aria-valuemin={MIN_SPLIT}
      aria-valuemax={MAX_SPLIT}
      aria-valuenow={split}
      tabIndex={0}
      title="Drag to resize · double-click for 50/50"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault(); // no text selection while dragging
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const grid = e.currentTarget.parentElement!.getBoundingClientRect();
        const handle = e.currentTarget.offsetWidth;
        onChange(clampSplit(((e.clientX - grid.left - handle / 2) / (grid.width - handle)) * 100));
      }}
      onDoubleClick={() => onChange(DEFAULT_SPLIT)}
      onKeyDown={(e) => {
        const next = {
          ArrowLeft: split - STEP,
          ArrowRight: split + STEP,
          Home: MIN_SPLIT,
          End: MAX_SPLIT,
        }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        onChange(clampSplit(next));
      }}
      className={`group cursor-col-resize touch-none justify-center self-stretch outline-none ${className}`}
    >
      <div className="relative w-0.5 rounded-full bg-black/10 group-hover:bg-indigo-500 group-focus-visible:bg-indigo-500 group-active:bg-indigo-500">
        <span className="sticky top-1/2 -ml-[5px] block h-10 w-3 rounded-full border border-black/20 bg-white shadow-sm group-hover:border-indigo-500" />
      </div>
    </div>
  );
}
