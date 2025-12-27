"use client";
import { useEffect, useState } from "react"
import { useCourses } from "./Context";


export const CourseSearch = () => {
  const ctx = useCourses()
  const [search, setSearch] = useState("apm346")
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const response = await fetch('/api/search?q=' + search).then(r => r.json())
      setResults(response)
    })()
  }, [search])

  return (
    <div className="flex flex-col w-full">
      <div className="flex text-sm">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full px-2 py-1 mb-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
        />
        {/* todo fix hardcode 30px */}
        <select className="w-16 h-[30px]"> <optgroup label="term">
          <option value="20261">2026W</option>
        </optgroup> </select>
      </div>
      {results.map(c =>
        <button className="w-full border border-slate-600 rounded p-2 text-left hover:border-blue-500 my-1"
          onClick={() => ctx.courseClick(c)} key={c.code}
        >
          {c.code} <span className="text-slate-400"> {c.name} </span>
        </button>)}
    </div>
  );
}

export const CoursesAdded = () => {
  const ctx = useCourses()

  const showSections = (course: any) => {
    const lec = course.sections.lec[ctx.picks[course.code]?.lec]?.name
    const tut = course.sections.tut[ctx.picks[course.code]?.tut]?.name
    const pra = course.sections.pra[ctx.picks[course.code]?.pra]?.name

    return <>
      {lec && <button className="underline mr-2" onClick={() => ctx.changePick(course.code, 'lec')}> {lec} </button>}
      {tut && <button className="underline mr-2" onClick={() => ctx.changePick(course.code, 'tut')}> {tut} </button>}
      {pra && <button className="underline mr-2" onClick={() => ctx.changePick(course.code, 'pra')}> {pra} </button>}
      <button className="underline mr-2">flexible</button>
    </>

  }

  return (
    <div className="flex flex-col w-full">
      {Object.values(ctx.added).map((c: any) =>
        <div className="w-full border border-slate-600 rounded p-2 text-left my-1" key={c.code}>
          {c.code} <span className="text-slate-400"> {c.name} </span>
          <div> {showSections(c)} </div>
        </div>)}

    </div>
  );
}