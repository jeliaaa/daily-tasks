"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  tasks: (
    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  ),
  overview: (
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  ),
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icons[name]}
    </svg>
  );
}

/** Vertical link used in the desktop sidebar. */
export function SideLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-indigo-600 text-white" : "text-zinc-700 hover:bg-black/5"
      }`}
    >
      <Icon name={icon} />
      {children}
    </Link>
  );
}

/** Icon-over-label link used in the mobile/tablet bottom bar. */
export function TabLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
        active ? "text-indigo-600" : "text-zinc-500"
      }`}
    >
      <Icon name={icon} />
      {children}
    </Link>
  );
}
