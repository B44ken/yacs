"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";

export type Course = {
  course: string;
  day: string;
  start: string;
  end: string;
  location: string;
};

type CoursesContextValue = {
  added: Course[];
  setAdded: Dispatch<SetStateAction<Course[]>>;
};

const CoursesContext = createContext<CoursesContextValue | null>(null);

export function useCourses() {
  const context = useContext(CoursesContext);
  if (!context) {
    throw new Error("useCourses must be used within the Context provider");
  }
  return context;
}

export default function Context({ children }: PropsWithChildren) {
  const [added, setAdded] = useState<Course[]>([]);
  const value = useMemo(() => ({ added, setAdded }), [added]);

  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>;
}
