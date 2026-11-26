"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition, type CSSProperties } from "react";
import { setTaskDone } from "@/lib/actions";
import { daysBetween, shortDay, todayStr } from "@/lib/dates";
import { prioritize, type Prioritizable, type Urgency } from "@/lib/priority";
import { AddTaskModal, useAddShortcuts, type Person } from "../add-task-modal";
import { DeleteTaskModal } from "./delete-task-modal";
import { DEFAULT_SPLIT, layoutCookie, type Layout } from "./layout-pref";
import { SplitHandle } from "./split-handle";

export type Task = Prioritizable & {
  title: string;
  description: string;
  done: boolean;
  doneAt: number | null;
  assignees: number[];
  createdBy: number | null;
};

type Modal = { task?: Task; done?: boolean };

type Tab = "todo" | "done";

const SECTIONS: { key: Urgency; title: string; heading: string; border: string; due: string }[] = [
  { key: "overdue", title: "Overdue", heading: "text-red-700", border: "border-l-red-500", due: "bg-red-50 text-red-700" },
  {
    key: "attention",
    title: "Needs attention",
    heading: "text-amber-700",
    border: "border-l-amber-500",
    due: "bg-amber-50 text-amber-800",
  },
  { key: "upcoming", title: "Upcoming", heading: "text-zinc-700", border: "border-l-zinc-300", due: "bg-black/5 text-zinc-600" },
];

const LAYOUTS: { mode: Layout["mode"]; label: string }[] = [
  { mode: "split", label: "Side by side" },
  { mode: "tabs", label: "Tabs" },
];

const empty = "rounded-2xl border border-black/10 px-3 py-10 text-center text-sm text-zinc-500";

/** "Thu, Nov 26", with the year added when it isn't this year. */
function dateLabel(day: string, today: string) {
  return day.slice(0, 4) === today.slice(0, 4) ? shortDay(day) : `${shortDay(day)}, ${day.slice(0, 4)}`;
}

function timeLeft(deadline: string, today: string) {
  const n = daysBetween(today, deadline);
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  if (n > 1) return `${n} days left`;
  return n === -1 ? "1 day overdue" : `${-n} days overdue`;
}

export function TaskList({
  tasks,
  today,
  people,
  meId,
  initialLayout,
}: {
  tasks: Task[];
  today: string;
  people: Person[];
  meId: number;
  initialLayout: Layout;
}) {
  const [items, apply] = useOptimistic(tasks, (state, a: { id: number; done: boolean }) =>
    // A just-finished task has no finish time until the server sends it.
    state.map((t) => (t.id === a.id ? { ...t, done: a.done, doneAt: null } : t)),
  );
  const [, startTransition] = useTransition();
  const [modal, setModal] = useState<Modal | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [tab, setTab] = useState<Tab>("todo");
  const [layout, setLayout] = useState(initialLayout);
  const sideBySide = layout.mode === "split"; // only applies on large screens

  useEffect(() => {
    document.cookie = layoutCookie(layout);
  }, [layout]);

  const openTodo = useCallback(() => setModal({ done: false }), []);
  const openDone = useCallback(() => setModal({ done: true }), []);
  useAddShortcuts(openTodo, openDone);

  function toggle(task: Task) {
    startTransition(async () => {
      apply({ id: task.id, done: !task.done });
      await setTaskDone(task.id, !task.done);
    });
  }

  const todo = items.filter((t) => !t.done);
  const open = prioritize(todo, today);
  const newest = (t: Task) => t.doneAt ?? Number.MAX_SAFE_INTEGER;
  const finished = items.filter((t) => t.done).sort((a, b) => newest(b) - newest(a));
  const nameOf = (id: number) => (id === meId ? "Me" : (people.find((p) => p.id === id)?.name ?? "?"));

  const row = (t: Task, border: string, due: string) => {
    const canManage = t.assignees.includes(meId) || t.createdBy === meId;
    return (
      <li
        key={t.id}
        className={`flex items-start gap-3 rounded-xl border border-l-4 border-black/10 bg-white p-3 shadow-sm ${border}`}
      >
        <input
          type="checkbox"
          checked={t.done}
          disabled={!canManage}
          onChange={() => toggle(t)}
          aria-label={t.done ? `Reopen ${t.title}` : `Mark ${t.title} as done`}
          title={canManage ? (t.done ? "Reopen" : "Mark as done") : "Only the assignees or the creator can change this"}
          className="mt-1 h-4 w-4 shrink-0 accent-indigo-600 enabled:cursor-pointer"
        />

        <div className="min-w-0 flex-1">
          <p className={`break-words font-medium ${t.done ? "text-zinc-500 line-through" : ""}`}>{t.title}</p>
          {t.description && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-500">{t.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className={`rounded px-1.5 py-0.5 font-medium ${due}`}>
              Deadline {dateLabel(t.deadline, today)}
              {!t.done && ` · ${timeLeft(t.deadline, today)}`}
            </span>
            <span>
              Added {dateLabel(t.added, today)}
              {t.createdBy !== null && !(t.assignees.length === 1 && t.assignees[0] === t.createdBy) &&
                ` by ${t.createdBy === meId ? "me" : nameOf(t.createdBy)}`}
            </span>
            {t.done && t.doneAt !== null && (
              <span className="text-emerald-700">Done {dateLabel(todayStr(new Date(t.doneAt)), today)}</span>
            )}
            <span className="flex flex-wrap gap-1">
              {t.assignees.map((id) => (
                <span key={id} className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                  {nameOf(id)}
                </span>
              ))}
            </span>
            {canManage && (
              <span className="ml-auto flex gap-1 text-sm">
                <button
                  type="button"
                  onClick={() => setModal({ task: t })}
                  className="rounded px-2 py-0.5 text-zinc-600 hover:bg-black/10"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(t)}
                  aria-label={`Delete ${t.title}`}
                  className="rounded px-2 py-0.5 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </span>
            )}
          </div>
        </div>
      </li>
    );
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "todo", label: "To do", count: todo.length },
    { key: "done", label: "Done", count: finished.length },
  ];
  // Below the large breakpoint only the active tab shows; side by side shows both.
  const panel = (key: Tab) => `min-w-0 ${tab === key ? "block" : "hidden"} ${sideBySide ? "lg:block" : ""}`;
  const columnTitle = `mb-3 hidden text-lg font-semibold ${sideBySide ? "lg:block" : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Shortcuts: <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">+</kbd> add to do ·{" "}
          <kbd className="rounded border px-1">Shift</kbd> + <kbd className="rounded border px-1">+</kbd> add done
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-2 text-sm lg:flex">
            {sideBySide && (
              <>
                {layout.split !== DEFAULT_SPLIT && (
                  <button
                    type="button"
                    onClick={() => setLayout({ ...layout, split: DEFAULT_SPLIT })}
                    className="rounded px-1.5 py-1 text-xs text-indigo-700 hover:bg-black/5"
                  >
                    Reset to 50 / 50
                  </button>
                )}
                <span className="text-xs tabular-nums text-zinc-500">
                  {layout.split} / {100 - layout.split}
                </span>
              </>
            )}
            <div role="group" aria-label="Layout" className="flex gap-1 rounded-lg bg-black/5 p-1 font-medium">
              {LAYOUTS.map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  aria-pressed={layout.mode === o.mode}
                  onClick={() => setLayout({ ...layout, mode: o.mode })}
                  className={`rounded-md px-3 py-1 ${layout.mode === o.mode ? "bg-white shadow-sm" : "text-zinc-500"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={openTodo}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Add task
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Task status"
        className={`grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1 text-sm font-medium ${sideBySide ? "lg:hidden" : ""}`}
      >
        {tabs.map((o) => (
          <button
            key={o.key}
            id={`tab-${o.key}`}
            type="button"
            role="tab"
            aria-selected={tab === o.key}
            aria-controls={`panel-${o.key}`}
            onClick={() => setTab(o.key)}
            className={`rounded-md py-2 ${tab === o.key ? "bg-white shadow-sm" : "text-zinc-500"}`}
          >
            {o.label} <span className="font-normal text-zinc-500">{o.count}</span>
          </button>
        ))}
      </div>

      <div
        className={sideBySide ? "lg:grid lg:grid-cols-(--columns)" : ""}
        style={
          {
            "--columns": `minmax(0, ${layout.split}fr) 1.5rem minmax(0, ${100 - layout.split}fr)`,
          } as CSSProperties
        }
      >
        <div id="panel-todo" role="tabpanel" aria-labelledby="tab-todo" className={panel("todo")}>
          <h2 className={columnTitle}>
            To do <span className="text-sm font-normal text-zinc-500">{todo.length}</span>
          </h2>
          <div className="space-y-6">
            {todo.length === 0 && <p className={empty}>No open tasks.</p>}
            {SECTIONS.filter((s) => open[s.key].length > 0).map((s) => (
              <section key={s.key}>
                <h3 className={`mb-2 font-medium ${s.heading}`}>
                  {s.title} <span className="text-sm font-normal text-zinc-500">{open[s.key].length}</span>
                </h3>
                <ul className="space-y-2">{open[s.key].map((t) => row(t, s.border, s.due))}</ul>
              </section>
            ))}
          </div>
        </div>

        {sideBySide && (
          <SplitHandle
            split={layout.split}
            onChange={(split) => setLayout((l) => ({ ...l, split }))}
            className="hidden lg:flex"
          />
        )}

        <div id="panel-done" role="tabpanel" aria-labelledby="tab-done" className={panel("done")}>
          <h2 className={columnTitle}>
            Done <span className="text-sm font-normal text-zinc-500">{finished.length}</span>
          </h2>
          {finished.length === 0 ? (
            <p className={empty}>Nothing finished yet.</p>
          ) : (
            <ul className="space-y-2">{finished.map((t) => row(t, "border-l-emerald-500", "bg-black/5 text-zinc-600"))}</ul>
          )}
        </div>
      </div>

      {modal && (
        <AddTaskModal
          key={modal.task?.id ?? `new-${modal.done}`}
          day={today}
          defaultDone={modal.done}
          task={modal.task}
          people={people}
          meId={meId}
          onClose={() => setModal(null)}
        />
      )}
      {deleting && <DeleteTaskModal key={deleting.id} task={deleting} onClose={() => setDeleting(null)} />}
    </>
  );
}
