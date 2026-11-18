"use server";

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

export async function addTask(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const day = formData.get("day");
  if (!title || !isDay(day)) return;
  const done = formData.get("done") === "1";
  // Anyone can add a task for any other user; the task is owned by the assignee.
  const assignee = Number(formData.get("assignee")) || user.id;
  await query(
    `INSERT INTO tasks (user_id, created_by, day, title, description, done, done_at)
     SELECT u.id, $1, $2, $3, $4, $5::boolean, CASE WHEN $5::boolean THEN now() END
     FROM users u WHERE u.id = $6`,
    [user.id, day, title, description, done, assignee],
  );
  revalidatePath("/tasks");
  revalidatePath("/overview");
}

export async function setTaskDone(id: number, done: boolean) {
  const user = await requireUser();
  if (!Number.isInteger(id)) return;
  await query(
    `UPDATE tasks SET done = $3::boolean,
       done_at = CASE WHEN $3::boolean THEN COALESCE(done_at, now()) END
     WHERE id = $1 AND user_id = $2`,
    [id, user.id, !!done],
  );
  revalidatePath("/tasks");
  revalidatePath("/overview");
}

export async function setTaskDay(id: number, day: string) {
  const user = await requireUser();
  if (!Number.isInteger(id) || !isDay(day)) return;
  // The assignee or whoever created the task may reschedule it.
  await query(
    "UPDATE tasks SET day = $3 WHERE id = $1 AND (user_id = $2 OR created_by = $2)",
    [id, user.id, day],
  );
  revalidatePath("/tasks");
  revalidatePath("/overview");
}

export async function removeTask(id: number) {
  const user = await requireUser();
  if (!Number.isInteger(id)) return;
  await query("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [id, user.id]);
  revalidatePath("/tasks");
  revalidatePath("/overview");
}
