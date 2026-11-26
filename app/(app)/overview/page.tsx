import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DayAdder } from "./day-adder";
import { DayCell, DraggableTask } from "./calendar-dnd";
import { query } from "@/lib/db";
import {
  currentMonth,
  isDay,
  isMonth,
  monthGrid,
  monthLabel,
  prettyDay,
  shiftMonth,
  todayStr,
} from "@/lib/dates";

type Row = {
  id: number;
  group_id: string;
  day: string;
  title: string;
  description: string;
  done: boolean;
  by: string | null;
  user_id: number;
  created_by: number | null;
  username: string;
};

const COLORS = [
  { dot: "bg-indigo-600", pill: "bg-indigo-600 text-white" },
  { dot: "bg-emerald-600", pill: "bg-emerald-600 text-white" },
  { dot: "bg-amber-500", pill: "bg-amber-500 text-black" },
  { dot: "bg-rose-600", pill: "bg-rose-600 text-white" },
  { dot: "bg-sky-600", pill: "bg-sky-600 text-white" },
  { dot: "bg-fuchsia-600", pill: "bg-fuchsia-600 text-white" },
];

const nameOf = (username: string) => username.split("@")[0];
const navBtn =
  "rounded-lg border border-black/10 px-3 py-1.5 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";

export default async function OverviewPage({ searchParams }: PageProps<"/overview">) {
  const me = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : currentMonth();
  const today = todayStr();

  const users = await query<{ id: number; username: string }>(
    "SELECT id, username FROM users ORDER BY id",
  );
  const rows = await query<Row>(
    `SELECT t.id, t.group_id, t.day, t.title, t.description, t.done, t.user_id, t.created_by, u.username,
       CASE WHEN t.created_by IS NOT NULL AND t.created_by <> t.user_id
            THEN split_part(c.username, '@', 1) END AS by
     FROM tasks t JOIN users u ON u.id = t.user_id
     LEFT JOIN users c ON c.id = t.created_by
     WHERE t.day LIKE $1
     ORDER BY t.day, t.id`,
    [`${month}-%`],
  );

  const colorOf = new Map(users.map((u, i) => [u.id, COLORS[i % COLORS.length]]));
  const byDay = new Map<string, Row[]>();
  for (const r of rows) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  const doneTotals = new Map<number, number>();
  const todoTotals = new Map<number, number>();
  for (const r of rows) {
    const m = r.done ? doneTotals : todoTotals;
    m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
  }

  const selected =
    isDay(sp.day) && sp.day.startsWith(month)
      ? sp.day
      : today.startsWith(month)
        ? today
        : null;
  const selectedRows = selected ? (byDay.get(selected) ?? []) : [];
  const people = users.map((u) => ({ id: u.id, name: nameOf(u.username) }));
  // A shared task has one row per assignee, all on the same day.
  const assigneesOf = new Map<string, number[]>();
  for (const r of selectedRows) assigneesOf.set(r.group_id, [...(assigneesOf.get(r.group_id) ?? []), r.user_id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-zinc-500">Done and to-do tasks for everyone, by day</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link href={`/overview?month=${shiftMonth(month, -1)}`} className={navBtn}>
            ←
          </Link>
          <span className="min-w-36 text-center font-medium">{monthLabel(month)}</span>
          <Link href={`/overview?month=${shiftMonth(month, 1)}`} className={navBtn}>
            →
          </Link>
          {month !== currentMonth() && (
            <Link href="/overview" className={navBtn}>
              Today
            </Link>
          )}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${colorOf.get(u.id)!.dot}`} />
            {nameOf(u.username)}
            <span className="text-zinc-500">
              ✓ {doneTotals.get(u.id) ?? 0} · ○ {todoTotals.get(u.id) ?? 0}
            </span>
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/15">
        <div className="grid grid-cols-7 border-b border-black/10 bg-black/[0.03] text-center text-xs font-medium text-zinc-500 dark:border-white/15 dark:bg-white/[0.04]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid(month).map((day, i) => {
            if (!day) return <div key={i} className="min-h-20 border-b border-r border-black/5 bg-black/[0.02] dark:border-white/10" />;
            const list = byDay.get(day) ?? [];
            const perUser = new Map<number, { done: number; todo: number }>();
            for (const r of list) {
              const c = perUser.get(r.user_id) ?? { done: 0, todo: 0 };
              if (r.done) c.done++;
              else c.todo++;
              perUser.set(r.user_id, c);
            }
            return (
              <DayCell
                key={day}
                day={day}
                href={`/overview?month=${month}&day=${day}`}
                className={`min-h-20 border-b border-r border-black/5 p-1.5 text-sm hover:bg-indigo-500/10 dark:border-white/10 ${
                  day === selected ? "bg-indigo-500/15" : ""
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    day === today ? "bg-indigo-600 text-white" : "text-zinc-500"
                  }`}
                >
                  {Number(day.slice(8))}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {users
                    .filter((u) => perUser.has(u.id))
                    .map((u) => {
                      const c = perUser.get(u.id)!;
                      return (
                        <span
                          key={u.id}
                          title={`${nameOf(u.username)}: ${c.done} done, ${c.todo} to do`}
                          className={`whitespace-nowrap rounded px-1.5 text-xs font-medium ${colorOf.get(u.id)!.pill}`}
                        >
                          {nameOf(u.username)[0].toUpperCase()} ✓{c.done}
                          {c.todo > 0 && <span className="opacity-80"> ○{c.todo}</span>}
                        </span>
                      );
                    })}
                </div>
              </DayCell>
            );
          })}
        </div>
      </div>

      {selected && (
        <section className="space-y-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">{prettyDay(selected)}</h2>
            <DayAdder
              day={selected}
              dayLabel={prettyDay(selected)}
              people={people}
              meId={me.id}
            />
          </div>
          {selectedRows.length === 0 && <p className="text-sm text-zinc-500">No tasks this day.</p>}
          {users
            .filter((u) => selectedRows.some((r) => r.user_id === u.id))
            .map((u) => (
              <div key={u.id}>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <span className={`h-3 w-3 rounded-full ${colorOf.get(u.id)!.dot}`} />
                  {nameOf(u.username)}
                </div>
                {[
                  { label: "Done", mark: "✓", done: true },
                  { label: "To do", mark: "○", done: false },
                ].map((g) => {
                  const items = selectedRows.filter((r) => r.user_id === u.id && r.done === g.done);
                  if (items.length === 0) return null;
                  return (
                    <div key={g.label} className="mb-2 pl-5">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {g.label} · {items.length}
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {items.map((r) => {
                          const assignees = assigneesOf.get(r.group_id)!;
                          return (
                            <DraggableTask
                              key={r.id}
                              task={{
                                id: r.id,
                                title: r.title,
                                description: r.description,
                                deadline: r.day,
                                assignees,
                              }}
                              canManage={assignees.includes(me.id) || r.created_by === me.id}
                              people={people}
                              meId={me.id}
                              className={g.done ? "" : "text-zinc-600"}
                            >
                              <span className="mr-1">{g.mark}</span>
                              {r.title}
                              {r.by && (
                                <span className="ml-2 whitespace-nowrap rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
                                  from {r.by}
                                </span>
                              )}
                              {r.description && (
                                <span className="block whitespace-pre-wrap pl-5 text-zinc-500">{r.description}</span>
                              )}
                            </DraggableTask>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
