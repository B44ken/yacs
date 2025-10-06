const DAY_NAMES = {
    mon: "monday",
    tue: "tuesday",
    wed: "wednesday",
    thu: "thursday",
    fri: "friday",
    sat: "saturday",
    sun: "sunday",
};

function formatTime(value) {
    if (typeof value !== "number") {
        return "";
    }
    const totalMinutes = Math.floor(value / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export async function onRequestGet({ request, env }) {
    const database = env?.yacs;
    if (!database) {
        return new Response("D1 binding missing", { status: 500 });
    }

    const url = new URL(request.url);
    const query = (url.searchParams.get("q") || "").trim();

    let statement = database.prepare(`
        SELECT c.code AS course,
                     l.day AS day,
                     l.start_time AS start_time,
                     l.end_time AS end_time,
                     l.location AS location
        FROM courses c
        JOIN options o ON o.course_id = c.id
        JOIN lectures l ON l.option_id = o.id
        ${query ? "WHERE c.code LIKE ?1" : ""}
        ORDER BY c.code, l.day, l.start_time
        LIMIT 50
    `);

    if (query) {
        statement = statement.bind(`${query.toUpperCase()}%`);
    }

    const { results = [] } = await statement.all();
    const payload = results.map((row) => ({
        course: row.course,
        day: DAY_NAMES[row.day] || row.day,
        start: formatTime(row.start_time),
        end: formatTime(row.end_time),
        location: row.location,
    }));

    return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
    });
}
