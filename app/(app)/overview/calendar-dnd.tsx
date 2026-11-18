"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { setTaskDay } from "@/lib/actions";

const MIME = "application/x-task-id";
const EDGE = 120; // px from viewport edge that triggers auto-scroll
const MAX_SPEED = 28; // px per frame

// Wheel events don't fire during a native drag, so scroll when the cursor nears the top/bottom.
function useDragAutoScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let y = -1;
    let raf = 0;
    const onOver = (e: DragEvent) => {
      y = e.clientY;
    };
    const tick = () => {
      if (y >= 0) {
        const h = window.innerHeight;
        if (y < EDGE) window.scrollBy(0, -MAX_SPEED * (1 - y / EDGE));
        else if (y > h - EDGE) window.scrollBy(0, MAX_SPEED * (1 - (h - y) / EDGE));
      }
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("dragover", onOver);
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("dragover", onOver);
      cancelAnimationFrame(raf);
      document.body.removeAttribute("data-task-drag"); // dragend may not fire if the item unmounts
    };
  }, [active]);
}

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
      className={`${className} transition-colors in-data-[task-drag]:outline-dashed in-data-[task-drag]:outline-1 in-data-[task-drag]:-outline-offset-4 in-data-[task-drag]:outline-indigo-400/60 ${
        over
          ? "bg-indigo-500/25 outline-solid! outline-2! -outline-offset-2! outline-indigo-500!"
          : ""
      } ${pending ? "opacity-60" : ""}`}
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
  const [dragging, setDragging] = useState(false);
  useDragAutoScroll(dragging);
  if (!canMove) return <li className={className}>{children}</li>;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME, String(id));
        e.dataTransfer.effectAllowed = "move";
        document.body.setAttribute("data-task-drag", "");
        setDragging(true);
      }}
      onDragEnd={() => {
        document.body.removeAttribute("data-task-drag");
        setDragging(false);
      }}
      title="Drag onto another day to reschedule"
      className={`cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40 ring-2 ring-indigo-500" : ""
      } ${className ?? ""}`}
    >
      {children}
    </li>
  );
}
