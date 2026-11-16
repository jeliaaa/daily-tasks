import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export default async function LoginPage() {
  if (await getUser()) redirect("/tasks");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AuthForm />
    </main>
  );
}
