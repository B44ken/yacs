import courses from "@/public/courses.json";

const makeStyle = (start: string, end: string, topTime = 11 * 60, bottomTime = 22 * 60) => {
  const startMinutes =
    start.split(":").map(Number)[0] * 60 + start.split(":").map(Number)[1];
  const endMinutes =
    end.split(":").map(Number)[0] * 60 + end.split(":").map(Number)[1];

  const topPercent = (startMinutes - topTime) / (bottomTime - topTime);
  const heightPercent = (endMinutes - startMinutes) / (bottomTime - topTime);

  return { top: `${topPercent * 100}%`, height: `${heightPercent * 100}%` };
};

type Course = (typeof courses)[number];

type EventProps = {
  course: Course;
  start: string;
  end: string;
};
const Event = ({ course, start, end }: EventProps) => {
  return (
    <div
      className="absolute left-0 right-0 bg-blue-500 rounded-lg p-2 text-white text-sm"
      style={makeStyle(start, end)}
    >
      <div className="font-semibold"> {course.course} </div>
      <div className="text-xs opacity-70"> {course.location} </div>
      <div className="text-xs opacity-70">
        {" "}
        {start} - {end}{" "}
      </div>
    </div>
  );
};

const Day = ({ day, events }: { day: string; events: Course[] }) => {
  return (
    <div className="m-1 flex min-w-[180px] flex-1 flex-col rounded-lg border border-slate-700 p-2">
      <div className="flex-shrink-0 font-bold capitalize">{day}</div>
      <div className="relative mt-2 flex min-h-0 flex-1">
        {events
          .filter(({ day: eventDay }) => eventDay === day)
          .map((event) => (
            <Event
              key={`${event.course}-${event.day}-${event.start}-${event.end}`}
              course={event}
              start={event.start}
              end={event.end}
            />
          ))}
      </div>
    </div>
  );
};

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday"];
export default () => {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-auto">
      {dayNames.map((D) => (
        <Day key={D} day={D} events={courses} />
      ))}
    </div>
  );
};
