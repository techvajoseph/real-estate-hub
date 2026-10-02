"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Appointment } from "@/lib/dashboard/types";

export function LandlordCalendar({
  asOf,
  appointments,
  onSelect,
}: {
  asOf: string;
  appointments: Appointment[];
  onSelect: (date: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const today = new Date(asOf);
  const month = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1),
  );
  const year = month.getUTCFullYear(),
    monthIndex = month.getUTCMonth();
  const start = (month.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const key = (day: number) =>
    year +
    "-" +
    String(monthIndex + 1).padStart(2, "0") +
    "-" +
    String(day).padStart(2, "0");
  return (
    <section className="ll-panel ll-calendar">
      <div className="ll-panel-heading">
        <h2>
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        <div>
          <button
            className="ll-icon-button"
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="ll-icon-button"
            aria-label="Next month"
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="ll-calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span className="ll-weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = key(i + 1);
          const hasEvent = appointments.some(
            (a) =>
              !a.completed &&
              new Date(a.starts_at).toLocaleDateString("en-CA", {
                timeZone: "Asia/Singapore",
              }) === date,
          );
          return (
            <button
              key={date}
              className={
                (date === asOf.slice(0, 10) ? "is-today " : "") +
                (hasEvent ? "has-event" : "")
              }
              aria-label={date + (hasEvent ? ", has appointments" : "")}
              aria-current={date === asOf.slice(0, 10) ? "date" : undefined}
              onClick={() => onSelect(date)}
            >
              {i + 1}
              {hasEvent && <i />}
            </button>
          );
        })}
      </div>
      <p className="ll-calendar-note">
        <i />
        Your appointments · Singapore time
      </p>
    </section>
  );
}
