"use client";

import { useState } from "react";
import { useCourses, type Course } from "@/component/Context";
import coursesData from "@/public/courses.json";

const courses = coursesData as Course[];

export const CourseSearch = () => {
  const [search, setSearch] = useState("");
  const { setAdded } = useCourses();
  const filtered = courses.filter(({ course }) =>
    course.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col w-full">
      <input
        type="text"
        placeholder="Search courses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 mb-2 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
      />
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.map((course) => (
          <button
            key={JSON.stringify(course)}
            type="button"
            className="w-full border border-slate-600 rounded p-2 text-left hover:border-blue-500"
            onClick={() =>
              setAdded((prev) => {
                if (
                  prev.some(
                    (existing) =>
                      JSON.stringify(existing) === JSON.stringify(course),
                  )
                ) {
                  return prev;
                }
                return [...prev, course];
              })
            }
          >
            <div className="font-bold">{course.course}</div>
            <div className="text-xs text-gray-500">
              {course.location} • {course.day} {course.start}-{course.end}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const CoursesAdded = () => {
  const { added, setAdded } = useCourses();
  return (
    <div className="flex flex-col w-full">
      <div className="font-bold mb-2">Added ({added.length})</div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {added.map((course) => (
          <button
            key={JSON.stringify(course)}
            type="button"
            className="w-full border border-slate-600 rounded p-2 text-left hover:border-red-500"
            onClick={() =>
              setAdded((prev) =>
                prev.filter(
                  (existing) =>
                    JSON.stringify(existing) !== JSON.stringify(course),
                ),
              )
            }
          >
            <div className="font-bold">{course.course}</div>
            <div className="text-xs text-gray-500">
              {course.location} • {course.day} {course.start}-{course.end}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
