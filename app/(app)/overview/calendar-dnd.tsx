"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { setTaskDay } from "@/lib/actions";

const MIME = "application/x-task-id";

export function DayCell({
  day,
  href,
  className,
  children,
}: {
  day: string;
  href: string;
  className: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = Number(e.dataTransfer.getData(MIME));
        if (id) startTransition(() => setTaskDay(id, day));
      }}
      draggable={false}
      className={`${className} ${over ? "ring-2 ring-inset ring-indigo-500 bg-indigo-500/20" : ""} ${
        pending ? "opacity-60" : ""
      }`}
    >
      {children}
    </Link>
  );
}

export function DraggableTask({
  id,
  canMove,
  className,
  children,
}: {
  id: number;
  canMove: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!canMove) return <li className={className}>{children}</li>;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME, String(id));
        e.dataTransfer.effectAllowed = "move";
      }}
      title="Drag onto another day to reschedule"
      className={`cursor-grab active:cursor-grabbing ${className ?? ""}`}
    >
      {children}
    </li>
  );
}
