"use server";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "./db";
import { createSession, destroySession, requireUser } from "./auth";
import { isDay } from "./dates";

// bcrypt hash of a random string, used only for constant-time-ish failed logins
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export type AuthState = { error?: string } | undefined;

export async function authenticate(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Accounts are created by scripts/seed-users.mjs; there is no public sign-up.
  const [user] = await query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE lower(username) = lower($1)",
    [email],
  );
  // Compare even when the user doesn't exist, to keep timing similar.
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Wrong email or password." };
  await createSession(user.id);
  redirect("/tasks");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// Matches every row of the task that row $1 belongs to, but only if user $2 is one of
// its assignees or created it.
const MANAGED_TASK = `group_id = (SELECT group_id FROM tasks WHERE id = $1)
  AND group_id IN (SELECT group_id FROM tasks WHERE user_id = $2 OR created_by = $2)`;

function readTaskForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const day = formData.get("day"); // the deadline
  const assignees = formData.getAll("assignee").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!title || !isDay(day)) return null;
  return { title, description, day, assignees };
}

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/overview");
}

export async function addTask(formData: FormData) {
  const user = await requireUser();
  const task = readTaskForm(formData);
  if (!task) return;
  const done = formData.get("done") === "1";
  // Anyone can add a task for anyone; every assignee gets a row in the same group.
  const assignees = task.assignees.length ? task.assignees : [user.id];
  await query(
    `INSERT INTO tasks (user_id, created_by, group_id, day, title, description, done, done_at)
     SELECT u.id, $1, $2::uuid, $3, $4, $5, $6::boolean, CASE WHEN $6::boolean THEN now() END
     FROM users u WHERE u.id = ANY($7::int[])`,
    [user.id, randomUUID(), task.day, task.title, task.description, done, assignees],
  );
  revalidateTasks();
}

export async function updateTask(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const task = readTaskForm(formData);
  if (!Number.isInteger(id) || !task || !task.assignees.length) return;
  // One statement, so the edit is atomic: drop removed assignees, update the ones who
  // stay, and add new ones with the original creator, date added and done state.
  await query(
    `WITH src AS (
       SELECT group_id, COALESCE(created_by, user_id) AS created_by, created_at, done, done_at
       FROM tasks WHERE ${MANAGED_TASK}
       ORDER BY id LIMIT 1
     ),
     wanted AS (SELECT id FROM users WHERE id = ANY($3::int[])),
     removed AS (
       DELETE FROM tasks t USING src
       WHERE t.group_id = src.group_id
         AND EXISTS (SELECT 1 FROM wanted) AND t.user_id NOT IN (SELECT id FROM wanted)
     ),
     updated AS (
       UPDATE tasks t SET title = $4, description = $5, day = $6, created_by = src.created_by
       FROM src
       WHERE t.group_id = src.group_id AND t.user_id IN (SELECT id FROM wanted)
     )
     INSERT INTO tasks (user_id, created_by, group_id, day, title, description, done, done_at, created_at)
     SELECT w.id, src.created_by, src.group_id, $6, $4, $5, src.done, src.done_at, src.created_at
     FROM wanted w CROSS JOIN src
     WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.group_id = src.group_id AND t.user_id = w.id)`,
    [id, user.id, task.assignees, task.title, task.description, task.day],
  );
  revalidateTasks();
}

export async function setTaskDone(id: number, done: boolean) {
  const user = await requireUser();
  if (!Number.isInteger(id)) return;
  // A shared task is one task: finishing it finishes it for everyone on it.
  await query(
    `UPDATE tasks SET done = $3::boolean,
       done_at = CASE WHEN $3::boolean THEN COALESCE(done_at, now()) END
     WHERE ${MANAGED_TASK}`,
    [id, user.id, !!done],
  );
  revalidateTasks();
}

export async function setTaskDay(id: number, day: string) {
  const user = await requireUser();
  if (!Number.isInteger(id) || !isDay(day)) return;
  await query(`UPDATE tasks SET day = $3 WHERE ${MANAGED_TASK}`, [id, user.id, day]);
  revalidateTasks();
}

/** Deletes a task for everyone on it, after the user re-enters their password. */
export async function removeTask(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (!Number.isInteger(id)) return { error: "This task can't be deleted." };
  const [me] = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!(await bcrypt.compare(password, me?.password_hash ?? DUMMY_HASH))) return { error: "Wrong password." };
  const deleted = await query(`DELETE FROM tasks WHERE ${MANAGED_TASK} RETURNING id`, [id, user.id]);
  revalidateTasks();
  return deleted.length ? {} : { error: "This task no longer exists, or you can't delete it." };
}
