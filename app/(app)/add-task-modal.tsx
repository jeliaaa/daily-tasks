"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { addTask, updateTask } from "@/lib/actions";

export type Person = { id: number; name: string };

export type EditableTask = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  assignees: number[];
};

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

function Submit({ label, busyLabel, disabled }: { label: string; busyLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || disabled}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
    >
      {pending ? busyLabel : label}
    </button>
  );
}

/**
 * Adds a new task, or edits `task` when one is given. With `copyFrom` the form starts
 * filled in from an existing task and saves it as a new one.
 */
export function AddTaskModal({
  day,
  defaultDone = false,
  task,
  copyFrom,
  people,
  meId,
  onClose,
}: {
  /** Default deadline for a new task. */
  day: string;
  dayLabel?: string;
  defaultDone?: boolean;
  task?: EditableTask;
  copyFrom?: Omit<EditableTask, "id">;
  people: Person[];
  meId: number;
  onClose: () => void;
}) {
  const initial = task ?? copyFrom;
  const [done, setDone] = useState(defaultDone);
  const [assignees, setAssignees] = useState(initial?.assignees ?? [meId]);
  const heading = task ? "Edit task" : copyFrom ? "Copy task" : "Add task";

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
        aria-label={heading}
        action={async (fd) => {
          await (task ? updateTask(fd) : addTask(fd));
          onClose();
        }}
        className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-zinc-500 hover:bg-black/5">
            ✕
          </button>
        </div>

        {task ? (
          <input type="hidden" name="id" value={task.id} />
        ) : (
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
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Task</span>
          <input name="title" required autoFocus maxLength={300} defaultValue={initial?.title} className={field} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Description (optional)</span>
          <textarea name="description" rows={3} maxLength={2000} defaultValue={initial?.description} className={field} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Deadline</span>
          <input type="date" name="day" required defaultValue={initial?.deadline ?? day} className={field} />
        </label>

        <fieldset className="text-sm">
          <legend className="mb-1 text-zinc-600">Assign to</legend>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = assignees.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 has-focus-visible:ring-2 has-focus-visible:ring-indigo-300 ${
                    on ? "border-indigo-600 bg-indigo-600 text-white" : "border-black/15 text-zinc-700 hover:bg-black/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="assignee"
                    value={p.id}
                    checked={on}
                    onChange={() => setAssignees(on ? assignees.filter((a) => a !== p.id) : [...assignees, p.id])}
                    className="sr-only"
                  />
                  {on && "✓ "}
                  {p.id === meId ? `Me (${p.name})` : p.name}
                </label>
              );
            })}
          </div>
          {assignees.length === 0 && <p className="mt-1 text-xs text-red-600">Pick at least one person.</p>}
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-black/5">
            Cancel
          </button>
          <Submit
            label={task ? "Save changes" : copyFrom ? "Create copy" : "Add task"}
            busyLabel={task ? "Saving..." : "Adding..."}
            disabled={assignees.length === 0}
          />
        </div>
      </form>
    </div>
  );
}
