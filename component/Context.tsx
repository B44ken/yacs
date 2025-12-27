"use client";

type Meetings = {name: string; times: Array<{ day: string; start: number; end: number }>}[];
export type Course = {
    code: string;
    name: string;
    description: string;
    sections: { lec: Meetings; tut: Meetings; pra: Meetings; }
}

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const context = createContext<any>(null);
export const useCourses = () => useContext(context);

export default function Context({ children }: { children: React.ReactNode }) {
  const [added, setAdded] = useState<{ [key: string]: Course }>({});
  const [picks, setPicks] = useState<{ [key: string]: { lec: number; tut: number | null; pra: number | null } }>({});

  const courseClick = useCallback((course: Course) => {
    if (added[course.code]) {
      delete added[course.code];
      setAdded({ ...added });
    } else {
      setAdded({ ...added, [course.code]: course })
      setPicks({
        ...picks,
        [course.code]: { lec: 0, tut: course.sections.tut.length > 0 ? 0 : null, pra: course.sections.pra.length > 0 ? 0 : null }
      })
    }
  }, [added, picks]);

  const changePick = useCallback((courseCode: string, type: 'lec' | 'tut' | 'pra') => {
    const newPicks = { ...picks };

    const num = added[courseCode].sections[type].length;
    if (num > 0)
      newPicks[courseCode][type] = (newPicks[courseCode][type]! + 1) % num;

    setPicks(newPicks);
  }, [added, picks]);

  const val = useMemo(() => ({ added, picks, setAdded, courseClick, changePick }), [added, picks, setAdded, courseClick, changePick]);
  return <context.Provider value={val}>{children}</context.Provider>
}