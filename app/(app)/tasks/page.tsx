import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { isDay, prettyDay, shiftDay, shortDay, todayStr } from "@/lib/dates";
import { Board, type Task } from "./board";

const navBtn =
  "rounded-lg border border-black/10 px-3 py-1.5 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const { date } = await searchParams;
  const day = isDay(date) ? date : todayStr();
  const isToday = day === todayStr();

  const tasks = await query<Task>(
    `SELECT t.id, t.title, t.description, t.done,
       CASE WHEN t.created_by IS NOT NULL AND t.created_by <> t.user_id
            THEN split_part(c.username, '@', 1) END AS by
     FROM tasks t LEFT JOIN users c ON c.id = t.created_by
     WHERE t.user_id = $1 AND t.day = $2 ORDER BY t.id`,
    [user.id, day],
  );
  const people = (await query<{ id: number; username: string }>("SELECT id, username FROM users ORDER BY id")).map(
    (u) => ({ id: u.id, name: u.username.split("@")[0] }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{isToday ? "Today" : prettyDay(day)}</h1>
          {isToday && <p className="text-sm text-zinc-500">{prettyDay(day)}</p>}
        </div>
        <div className="flex gap-1 text-sm">
          <Link href={`/tasks?date=${shiftDay(day, -1)}`} className={navBtn}>
            ←
          </Link>
          {!isToday && (
            <Link href="/tasks" className={navBtn}>
              Today
            </Link>
          )}
          <Link href={`/tasks?date=${shiftDay(day, 1)}`} className={navBtn}>
            →
          </Link>
        </div>
      </div>

      <Board day={day} dayLabel={shortDay(day)} tasks={tasks} people={people} meId={user.id} />
    </div>
  );
}
