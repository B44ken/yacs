"use client";

import { useCourses, Course } from "../component/Context";

type CalendarEvent = {
  code: string;
  day: string;
  start: number;
  end: number;
  section?: string;
};

const makeStyle = (start: number, end: number, top = 9 * 60, bottom = 22 * 60) => {
  const topPc = (start - top) / (bottom - top);
  const htPc = (end - start) / (bottom - top);
  return { top: `${topPc * 100}%`, height: `${htPc * 100}%` };
};
const Event = ({ event }: { event: CalendarEvent }) => {
  const time = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  return (
    <div
      className="absolute left-0 right-0 bg-blue-500 rounded-lg p-2 text-white text-sm"
      style={makeStyle(event.start, event.end)}>
      <div className="font-semibold"> {event.code} </div>
      {event.section && <div className="text-xs opacity-70"> {event.section} </div>}
      <div className="text-xs opacity-70">
        {time(event.start)} - {time(event.end)}
      </div>
    </div>
  );
};

const Day = ({ day, events }: { day: string; events: CalendarEvent[] }) => {
  return (
    <div className="m-1 flex min-w-[180px] flex-1 flex-col rounded-lg border border-slate-600 p-2">
      <div className="flex-shrink-0 font-bold">{day}</div>
      <div className="relative mt-2 flex min-h-0 flex-1">
        {events
          .filter((e) => e.day == day)
          .map((e) => <Event key={`${e.code}${e.day}${e.start}`} event={e} />)}
      </div>
    </div>
  );
};

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday"]
export default () => {
  const { added, picks } = useCourses()

  const events: CalendarEvent[] = []

  for (const course in added) {
    const c = added[course], p = picks[course]
    const lecSection = c.sections.lec?.[p?.lec]
    const tutSection = c.sections.tut?.[p?.tut]
    const praSection = c.sections.pra?.[p?.pra]

    if (lecSection?.times)
      events.push(...lecSection.times.map((e: any) => ({ ...e, code: c.code, section: lecSection.name })))
    if (tutSection?.times)
      events.push(...tutSection.times.map((e: any) => ({ ...e, code: c.code, section: tutSection.name })))
    if (praSection?.times)
      events.push(...praSection.times.map((e: any) => ({ ...e, code: c.code, section: praSection.name })))
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-auto">
      {dayNames.map((D) => <Day key={D} day={D} events={events} />)}
    </div>
  );
};
