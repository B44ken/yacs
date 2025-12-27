type Meetings = {
    name: string;
    times: Array<{ day: string; start: number; end: number }>;
}[];

type Course = {
    code: string;
    name: string;
    description: string;
    sections: { lec: Meetings; tut: Meetings | null; pra: Meetings | null };
};

const searchTTB = async (code: string): Promise<Course[]> => {
    const days = ['error', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const req = await fetch("https://api.easi.utoronto.ca/ttb/getPageableCourses", {
        "method": "POST", "headers": { "accept": "application/json, text/plain, */*", "content-type": "application/json" },
        "body": `{"courseCodeAndTitleProps":{"courseCode":"","courseTitle":"${code}","courseSectionCode":"","searchCourseDescription":true},"departmentProps":[],"campuses":[],"sessions":["20261"],"divisions":["ARTSC"],"page":1,"pageSize":20,"direction":"asc"}`
    }).then(x => x.json())

    const formatSingleCourse = (course: any) => {
        const getSectionsType = (type: string) =>
            course.sections.filter((s: any) => s.name.startsWith(type)).map((section: any) => ({
                name: section.name,
                times: section.meetingTimes.map((m: any) =>
                    ({ day: days[m.start.day], start: m.start.millisofday / 60_000, end: m.end.millisofday / 60_000 }))
            })).sort((a: any, b: any) => a.name.localeCompare(b.name));

        return {
            code: course.code,
            name: course.name,
            description: course.cmCourseInfo.description,
            sections: {
                lec: getSectionsType('LEC'),
                pra: getSectionsType('PRA') || null,
                tut: getSectionsType('TUT') || null,
            }
        }
    }

    return req.payload.pageableCourse.courses.map(formatSingleCourse)
}

export async function GET(request: Request) {
    const q = new URL(request.url).searchParams.get('q') || ''
    return Response.json(await searchTTB(q))
}