const API_URL = "https://api.easi.utoronto.ca/ttb/getPageableCourses";

const DEFAULT_DIVISIONS = ["ARTSC", "APSC"];
const DEFAULT_PAGE_SIZE = 50;
const DAY_INDEX_TO_CODE = {
	1: "mon",
	2: "tue",
	3: "wed",
	4: "thu",
	5: "fri",
	6: "sat",
	7: "sun",
};

function millisToSeconds(millis) {
	if (typeof millis !== "number" || Number.isNaN(millis)) {
		return null;
	}
	return Math.round(millis / 1000);
}

function parseSectionNumber(raw, fallback = 0) {
	const value = Number.parseInt(`${raw ?? ""}`, 10);
	if (Number.isNaN(value)) {
		return fallback;
	}
	return value;
}

function formatLocation(building = {}) {
	const { buildingCode = "", buildingRoomNumber = "", buildingRoomSuffix = "" } = building;
	const parts = [buildingCode.trim(), `${buildingRoomNumber}${buildingRoomSuffix}`.trim()].filter(Boolean);
	return parts.length ? parts.join(" ") : "TBA";
}

function formatInstructor(instructors = []) {
	if (!Array.isArray(instructors) || instructors.length === 0) {
		return "TBA";
	}
	return instructors
		.map((person) => {
			const first = (person.firstName ?? "").trim();
			const last = (person.lastName ?? "").trim();
			return [first, last].filter(Boolean).join(" ");
		})
		.filter(Boolean)
		.join(", ") || "TBA";
}

function extractMeetingTimes(section, { targetSession, fallbackSectionNumber }) {
	const meetings = Array.isArray(section?.meetingTimes) ? section.meetingTimes : [];
	const instructor = formatInstructor(section?.instructors);

	return meetings
		.filter((meeting) => {
			if (!meeting?.start || !meeting?.end) {
				return false;
			}
			if (!targetSession) {
				return true;
			}
			return !meeting.sessionCode || meeting.sessionCode === targetSession;
		})
		.map((meeting, index) => {
			const dayCode = DAY_INDEX_TO_CODE[meeting.start?.day];
			const start = millisToSeconds(meeting.start?.millisofday);
			const end = millisToSeconds(meeting.end?.millisofday);

			if (!dayCode || start == null || end == null || start >= end) {
				return null;
			}

			return {
				section: parseSectionNumber(section?.sectionNumber, fallbackSectionNumber * 100 + index),
				day: dayCode,
				start,
				end,
				location: formatLocation(meeting.building),
				instructor,
			};
		})
		.filter(Boolean);
}

function mergeLinkedSections(sections, targetSession) {
	const lectures = new Map();

	for (const section of sections ?? []) {
		if (!section || section.cancelInd === "Y") {
			continue;
		}

		if (section.teachMethod === "LEC") {
			lectures.set(section.sectionNumber, {
				section,
				meetings: extractMeetingTimes(section, {
					targetSession,
					fallbackSectionNumber: parseSectionNumber(section.sectionNumber, lectures.size),
				}),
				attachments: [],
			});
		}
	}

	for (const section of sections ?? []) {
		if (!section || section.teachMethod === "LEC" || section.cancelInd === "Y") {
			continue;
		}

		const linkedLectures = Array.isArray(section.linkedMeetingSections)
			? section.linkedMeetingSections.filter((linked) => linked?.teachMethod === "LEC")
			: [];

		for (const link of linkedLectures) {
			const lecture = lectures.get(link.sectionNumber);
			if (!lecture) {
				continue;
			}

			const attachmentMeetings = extractMeetingTimes(section, {
				targetSession,
				fallbackSectionNumber: parseSectionNumber(section.sectionNumber, lecture.meetings.length + lecture.attachments.length),
			});

			if (attachmentMeetings.length > 0) {
				lecture.attachments.push(...attachmentMeetings);
			}
		}
	}

	return Array.from(lectures.values())
		.map(({ section, meetings, attachments }, index) => {
			const lecturesForOption = [...meetings, ...attachments];
			if (lecturesForOption.length === 0) {
				return null;
			}

			return {
				number: index,
				lectures: lecturesForOption,
			};
		})
		.filter(Boolean);
}

function normaliseCourse(course, { session }) {
	const sections = mergeLinkedSections(course?.sections ?? [], session);
	if (sections.length === 0) {
		return null;
	}

	const title = course?.name || course?.cmCourseInfo?.title || course?.code;
	return {
		code: course?.code ?? "",
		title: title ?? "Untitled Course",
		semester: session ?? course?.sessions?.[0] ?? "",
		options: sections,
	};
}

async function fetchCoursePayload({ code, sessions, divisions, pageSize, searchBy }) {
	const trimmedCode = code?.trim() ?? "";
	let courseCodeValue = "";
	let courseTitleValue = "";

	switch (searchBy) {
		case "title":
			courseTitleValue = trimmedCode;
			break;
		case "code":
			courseCodeValue = trimmedCode;
			courseTitleValue = trimmedCode;
			break;
		default:
			courseCodeValue = trimmedCode;
	}

	const body = {
		courseCodeAndTitleProps: {
			courseCode: courseCodeValue,
			courseTitle: courseTitleValue,
			courseSectionCode: "",
			searchCourseDescription: true,
		},
		departmentProps: [],
		campuses: [],
		sessions: Array.isArray(sessions) && sessions.length > 0 ? sessions : undefined,
		requirementProps: [],
		instructor: "",
		courseLevels: [],
		deliveryModes: [],
		dayPreferences: [],
		timePreferences: [],
		divisions: Array.isArray(divisions) && divisions.length > 0 ? divisions : DEFAULT_DIVISIONS,
		creditWeights: [],
		availableSpace: false,
		waitListable: false,
		page: 1,
		pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
		direction: "asc",
	};

	const response = await fetch(API_URL, {
		method: "POST",
		headers: {
			accept: "application/json, text/plain, */*",
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(`uoft adapter request failed (${response.status}): ${message}`);
	}

	const payload = await response.json();
	const courses = payload?.payload?.pageableCourse?.courses;
	return Array.isArray(courses) ? courses : [];
}

export async function getCourses({
	codes,
	session,
	sessions,
	divisions,
	pageSize,
	searchBy = "code",
} = {}) {
	if (!Array.isArray(codes) || codes.length === 0) {
		throw new Error("uoft adapter requires at least one course code");
	}

	const uniqueCodes = Array.from(new Set(codes.map((code) => code?.trim()).filter(Boolean)));
	const targetSession = session;
	const sessionFilters = Array.isArray(sessions) && sessions.length > 0 ? sessions : targetSession ? [targetSession] : [];

	const allCourses = [];
	for (const code of uniqueCodes) {
		const fetched = await fetchCoursePayload({
			code,
			sessions: sessionFilters,
			divisions,
			pageSize,
			searchBy,
		});

		for (const course of fetched) {
			if (targetSession && !course.sessions?.includes(targetSession)) {
				continue;
			}
			if (!course.code?.toUpperCase().startsWith(code.toUpperCase().trim())) {
				continue;
			}

			const normalised = normaliseCourse(course, { session: targetSession });
			if (normalised) {
				allCourses.push(normalised);
			}
		}
	}

	return allCourses;
}
