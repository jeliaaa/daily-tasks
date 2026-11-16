"use client";

import { useActionState } from "react";
import { authenticate } from "@/lib/actions";

const input =
  "mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function AuthForm() {
  const [state, action, pending] = useActionState(authenticate, undefined);

  return (
    <form
      action={action}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-900"
    >
      <h1 className="text-2xl font-semibold">Daily Tasks</h1>
      <label className="block text-sm">
        Email
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="block text-sm">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "..." : "Log in"}
      </button>
    </form>
  );
}
