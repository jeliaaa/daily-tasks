"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { addTask } from "@/lib/actions";

export type Person = { id: number; name: string };

const field =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500";

/**
 * Ctrl + "+"  -> onTodo
 * Shift + "+" -> onDone
 * Ignored while typing in a field.
 */
export function useAddShortcuts(onTodo: () => void, onDone: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        onTodo();
      } else if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key === "+") {
        e.preventDefault();
        onDone();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTodo, onDone]);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add task"}
    </button>
  );
}

export function AddTaskModal({
  day,
  dayLabel,
  defaultDone,
  people,
  meId,
  onClose,
}: {
  day: string;
  dayLabel: string;
  defaultDone: boolean;
  people: Person[];
  meId: number;
  onClose: () => void;
}) {
  const [done, setDone] = useState(defaultDone);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Add task"
        action={async (fd) => {
          await addTask(fd);
          onClose();
        }}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add task</h2>
            <p className="text-xs text-zinc-500">{dayLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-zinc-500 hover:bg-black/5">
            ✕
          </button>
        </div>

        <input type="hidden" name="day" value={day} />

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1 text-sm font-medium">
          {[
            { v: false, label: "To do" },
            { v: true, label: "Done" },
          ].map((o) => (
            <label
              key={o.label}
              className={`cursor-pointer rounded-md py-1.5 text-center ${done === o.v ? "bg-white shadow-sm" : "text-zinc-500"}`}
            >
              <input
                type="radio"
                name="done"
                value={o.v ? "1" : "0"}
                checked={done === o.v}
                onChange={() => setDone(o.v)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Assign to</span>
          <select name="assignee" defaultValue={meId} className={field}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === meId ? `Me (${p.name})` : p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Task</span>
          <input name="title" required autoFocus maxLength={300} className={field} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Description (optional)</span>
          <textarea name="description" rows={3} maxLength={2000} className={field} />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-black/5">
            Cancel
          </button>
          <Submit />
        </div>
      </form>
    </div>
  );
}
