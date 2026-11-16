"use client";

import { useCallback, useState } from "react";
import { AddTaskModal, useAddShortcuts, type Person } from "../add-task-modal";

/** "+ Add task" button for the selected calendar day (also reacts to Ctrl/Shift + "+"). */
export function DayAdder({
  day,
  dayLabel,
  people,
  meId,
}: {
  day: string;
  dayLabel: string;
  people: Person[];
  meId: number;
}) {
  const [modal, setModal] = useState<{ done: boolean } | null>(null);
  const openTodo = useCallback(() => setModal({ done: false }), []);
  const openDone = useCallback(() => setModal({ done: true }), []);
  useAddShortcuts(openTodo, openDone);

  return (
    <>
      <button
        type="button"
        onClick={openTodo}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        + Add task
      </button>
      {modal && (
        <AddTaskModal
          day={day}
          dayLabel={dayLabel}
          defaultDone={modal.done}
          people={people}
          meId={meId}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
