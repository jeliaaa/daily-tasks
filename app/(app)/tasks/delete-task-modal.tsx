"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { removeTask } from "@/lib/actions";

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Yes, delete"}
    </button>
  );
}

/** "Are you sure?" dialog. The task is only deleted if the password is right. */
export function DeleteTaskModal({
  task,
  onClose,
}: {
  task: { id: number; title: string; assignees: number[] };
  onClose: () => void;
}) {
  const [error, setError] = useState<string>();

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
        aria-describedby="delete-task-text"
        action={async (fd) => {
          setError(undefined);
          const result = await removeTask(fd);
          if (result.error) setError(result.error);
          else onClose();
        }}
        className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="delete-task-title" className="text-lg font-semibold">
          Are you sure?
        </h2>
        <p id="delete-task-text" className="break-words text-sm text-zinc-600">
          Delete <strong>{task.title}</strong>
          {task.assignees.length > 1 && " for everyone assigned to it"}? This can&apos;t be undone.
        </p>

        <input type="hidden" name="id" value={task.id} />
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Enter your password to confirm</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={!!error}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-black/5">
            No, keep it
          </button>
          <Confirm />
        </div>
      </form>
    </div>
  );
}
