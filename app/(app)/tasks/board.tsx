"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import { removeTask, setTaskDone } from "@/lib/actions";
import { AddTaskModal, useAddShortcuts, type Person } from "../add-task-modal";

export type Task = { id: number; title: string; description: string; done: boolean; by: string | null };

type Action = { type: "move"; id: number; done: boolean } | { type: "remove"; id: number };

export function Board({
  day,
  dayLabel,
  tasks,
  people,
  meId,
}: {
  day: string;
  dayLabel: string;
  tasks: Task[];
  people: Person[];
  meId: number;
}) {
  const [items, apply] = useOptimistic(tasks, (state, a: Action) =>
    a.type === "remove"
      ? state.filter((t) => t.id !== a.id)
      : state.map((t) => (t.id === a.id ? { ...t, done: a.done } : t)),
  );
  const [, startTransition] = useTransition();
  const [modal, setModal] = useState<{ done: boolean } | null>(null);

  const openTodo = useCallback(() => setModal({ done: false }), []);
  const openDone = useCallback(() => setModal({ done: true }), []);
  useAddShortcuts(openTodo, openDone);

  function move(id: number, done: boolean) {
    const t = items.find((x) => x.id === id);
    if (!t || t.done === done) return;
    startTransition(async () => {
      apply({ type: "move", id, done });
      await setTaskDone(id, done);
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      apply({ type: "remove", id });
      await removeTask(id);
    });
  }

  return (
    <>
      <p className="-mt-2 text-xs text-zinc-500">
        Shortcuts: <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">+</kbd> add to do ·{" "}
        <kbd className="rounded border px-1">Shift</kbd> + <kbd className="rounded border px-1">+</kbd> add done
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {[false, true].map((done) => (
          <Column
            key={String(done)}
            title={done ? "Done" : "To do"}
            done={done}
            dayLabel={dayLabel}
            tasks={items.filter((t) => t.done === done)}
            onAdd={() => setModal({ done })}
            onMove={move}
            onRemove={remove}
          />
        ))}
      </div>

      {modal && (
        <AddTaskModal
          day={day}
          dayLabel={dayLabel}
          defaultDone={modal.done}
          people={people}
          meId={meId}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function Column({
  title,
  done,
  dayLabel,
  tasks,
  onAdd,
  onMove,
  onRemove,
}: {
  title: string;
  done: boolean;
  dayLabel: string;
  tasks: Task[];
  onAdd: () => void;
  onMove: (id: number, done: boolean) => void;
  onRemove: (id: number) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = Number(e.dataTransfer.getData("text/plain"));
        if (id) onMove(id, done);
      }}
      className={`min-h-64 rounded-2xl border p-3 transition-colors ${
        over ? "border-indigo-500 bg-indigo-500/10" : "border-black/10 bg-black/[0.03]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-medium">
          {title} <span className="text-sm font-normal text-zinc-500">{tasks.length}</span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add to ${title}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none hover:bg-black/10"
        >
          +
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.length === 0 && (
          <li className="px-1 py-6 text-center text-sm text-zinc-500">
            {done ? "Drop finished tasks here or press +" : "Nothing to do. Press +"}
          </li>
        )}
        {tasks.map((t) => (
          <li
            key={t.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(t.id));
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab rounded-xl border border-black/10 bg-white p-3 shadow-sm active:cursor-grabbing"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-zinc-500">
                {dayLabel}
                {t.by && <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">from {t.by}</span>}
              </span>
              <div className="flex items-center gap-1 text-sm text-zinc-400">
                <button
                  type="button"
                  onClick={() => onMove(t.id, !done)}
                  aria-label={done ? "Move to To do" : "Move to Done"}
                  title={done ? "Move to To do" : "Move to Done"}
                  className="rounded px-1.5 hover:bg-black/10 hover:text-zinc-700"
                >
                  {done ? "←" : "→"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(t.id)}
                  aria-label="Delete task"
                  className="rounded px-1.5 hover:bg-black/10 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className={`mt-1 font-medium ${done ? "text-zinc-500 line-through" : ""}`}>{t.title}</p>
            {t.description && <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-500">{t.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
