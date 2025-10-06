type lecture = {
	section: number,
	day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
	start: number,
	end: number,
	location: string,
	instructor: string
}

type course = {
	session: string,
	title: string,
	code: string,
	credits: number,
	options: lecture[][]
}

type user = {
	profile: {
		name: string,
		email: string,
	},
	schedules: course[][][],
}