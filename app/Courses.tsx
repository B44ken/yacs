"use client";

import { useEffect, useState } from "react";
import { type Course, useCourses } from "@/component/Context";

export const CourseSearch = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const { setAdded } = useCourses();

  useEffect(() => {
    const query = search.trim();
    const endpoint = query
      ? `/api/courses?q=${encodeURIComponent(query)}`
      : "/api/courses";
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = await response.json();
        if (Array.isArray(payload)) {
          setResults(payload as Course[]);
        } else {
          setResults([]);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error);
          setResults([]);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [search]);

  const filtered = results;

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
