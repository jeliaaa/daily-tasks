import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { Icon, SideLink, TabLink } from "./nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      {/* Desktop: left sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-black/10 bg-white p-4 lg:flex">
        <div className="mb-6 px-3 text-lg font-semibold">Daily Tasks</div>
        <nav className="flex flex-1 flex-col gap-1">
          <SideLink href="/tasks" icon="tasks">
            Tasks
          </SideLink>
          <SideLink href="/overview" icon="overview">
            Overview
          </SideLink>
        </nav>
        <div className="border-t border-black/10 pt-3">
          <p className="truncate px-3 pb-2 text-xs text-zinc-500" title={user.username}>
            {user.username}
          </p>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5">
              <Icon name="logout" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      <main className="w-full flex-1 px-4 py-6 pb-28 lg:pb-8 lg:pl-[calc(15rem+2rem)] lg:pr-8 lg:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Phones and tablets: bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <TabLink href="/tasks" icon="tasks">
          Tasks
        </TabLink>
        <TabLink href="/overview" icon="overview">
          Overview
        </TabLink>
        <form action={logout} className="contents">
          <button className="flex flex-col items-center gap-0.5 py-2 text-xs font-medium text-zinc-500">
            <Icon name="logout" />
            Logout
          </button>
        </form>
      </nav>
    </>
  );
}
