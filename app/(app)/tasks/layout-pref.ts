// How the Tasks page is laid out on large screens. Kept in a cookie so the server
// renders the saved layout straight away. Phones and tablets always use tabs.

export const LAYOUT_COOKIE = "tasks_layout";
export const MIN_SPLIT = 30;
export const MAX_SPLIT = 70;
export const DEFAULT_SPLIT = 50;

export type Layout = {
  mode: "split" | "tabs";
  /** Width of the To do column in percent, when side by side. */
  split: number;
};

export function clampSplit(n: number) {
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, Math.round(n)));
}

/** Cookie values look like "split:50" or "tabs:50". Anything else gives the default. */
export function parseLayout(value: string | undefined): Layout {
  const [mode, split] = (value ?? "").split(":");
  const n = Number(split);
  return {
    mode: mode === "tabs" ? "tabs" : "split",
    split: split && Number.isFinite(n) ? clampSplit(n) : DEFAULT_SPLIT,
  };
}

export function layoutCookie({ mode, split }: Layout) {
  return `${LAYOUT_COOKIE}=${mode}:${split}; path=/; max-age=31536000; samesite=lax`;
}
