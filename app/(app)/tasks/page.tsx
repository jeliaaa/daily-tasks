import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { prettyDay, todayStr } from "@/lib/dates";
import { ATTENTION_DAYS, MAX_HEAD_START } from "@/lib/priority";
import { LAYOUT_COOKIE, parseLayout } from "./layout-pref";
import { TaskList, type Task } from "./task-list";

type Row = {
  id: number;
  group_id: string;
  user_id: number;
  created_by: number | null;
  day: string;
  title: string;
  description: string;
  done: boolean;
  created_at: Date;
  done_at: Date | null;
};

const VIEWS = [
  { key: "mine", label: "Mine", href: "/tasks" },
  { key: "all", label: "Everyone", href: "/tasks?view=all" },
];

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const view = (await searchParams).view === "all" ? "all" : "mine";
  const layout = parseLayout((await cookies()).get(LAYOUT_COOKIE)?.value);
  const today = todayStr();

  // Open tasks and the full history of finished ones.
  const rows = await query<Row>(
    `SELECT id, group_id, user_id, created_by, day, title, description, done, created_at, done_at
     FROM tasks
     ORDER BY id`,
  );
  const people = (await query<{ id: number; username: string }>("SELECT id, username FROM users ORDER BY id")).map(
    (u) => ({ id: u.id, name: u.username.split("@")[0] }),
  );

  // One row per assignee in the database, one entry per task here.
  const byGroup = new Map<string, Task>();
  for (const r of rows) {
    const existing = byGroup.get(r.group_id);
    if (existing) {
      existing.assignees.push(r.user_id);
      continue;
    }
    const added = new Date(r.created_at);
    byGroup.set(r.group_id, {
      id: r.id,
      title: r.title,
      description: r.description,
      deadline: r.day,
      added: todayStr(added),
      addedAt: added.getTime(),
      done: r.done,
      doneAt: r.done ? new Date(r.done_at ?? r.created_at).getTime() : null,
      assignees: [r.user_id],
      createdBy: r.created_by,
    });
  }
  const tasks = [...byGroup.values()].filter((t) => view === "all" || t.assignees.includes(user.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-zinc-500">{prettyDay(today)}</p>
        </div>
        <nav aria-label="Whose tasks" className="flex gap-1 rounded-lg bg-black/5 p-1 text-sm font-medium">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={v.href}
              aria-current={view === v.key ? "page" : undefined}
              className={`rounded-md px-3 py-1 ${view === v.key ? "bg-white shadow-sm" : "text-zinc-500"}`}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="text-xs text-zinc-500">
        Overdue first, then tasks due within {ATTENTION_DAYS} days, then the rest. Earlier deadlines rank higher; a task
        that has been waiting longer can move ahead of one due up to {MAX_HEAD_START} days sooner, but never ahead of one due
        today.
      </p>

      <TaskList tasks={tasks} today={today} people={people} meId={user.id} initialLayout={layout} />
    </div>
  );
}
