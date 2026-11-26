import { query } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { isWorkday, todayStr } from "@/lib/dates";

// Called by Vercel Cron (see vercel.json) at 17:50 Asia/Tbilisi on workdays.
// Vercel sends "Authorization: Bearer $CRON_SECRET".
// Add ?dry=1 to see who would be reminded without sending anything,
// and ?force=1 to ignore the weekend check.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";

  if (!force && !isWorkday()) return Response.json({ skipped: "not a workday" });

  const day = todayStr();
  // "Filled" = the user finished a task today, or has a done task dated today.
  // (A task's day is its deadline, so work finished today may carry another date.)
  const missing = await query<{ username: string }>(
    `SELECT u.username FROM users u
     WHERE NOT EXISTS (
       SELECT 1 FROM tasks t WHERE t.user_id = u.id AND t.done
         AND (t.day = $1 OR (t.done_at AT TIME ZONE 'Asia/Tbilisi')::date = $1::date)
     )
     ORDER BY u.username`,
    [day],
  );

  if (dry) return Response.json({ day, wouldRemind: missing.map((m) => m.username) });

  const appUrl = process.env.APP_URL || "https://tasks.th.com.ge";
  const results = await Promise.allSettled(
    missing.map((m) =>
      sendMail({
        to: m.username,
        subject: "Reminder: fill in today's completed jobs",
        html: `<p>Hi,</p>
<p>You haven't marked any jobs as done for today (${day}) yet.</p>
<p>Please open <a href="${appUrl}/tasks">${appUrl}/tasks</a>, check off what you completed and add anything else you did.</p>`,
      }),
    ),
  );

  return Response.json({
    day,
    reminded: missing.filter((_, i) => results[i].status === "fulfilled").map((m) => m.username),
    failed: missing
      .map((m, i) => ({ to: m.username, r: results[i] }))
      .filter((x) => x.r.status === "rejected")
      .map((x) => ({ to: x.to, error: String((x.r as PromiseRejectedResult).reason) })),
  });
}
