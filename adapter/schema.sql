CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE courses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code TEXT NOT NULL,
    semester TEXT NOT NULL,
    title TEXT NOT NULL,
    UNIQUE(code, semester)
);

CREATE TABLE options (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    option_number INTEGER NOT NULL CHECK (option_number >= 0),
    UNIQUE(course_id, option_number)
);

CREATE TABLE lectures (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    option_id TEXT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    section INTEGER NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
    start_time INTEGER NOT NULL CHECK (start_time >= 0 AND start_time < 86400),
    end_time INTEGER NOT NULL CHECK (end_time >= 0 AND end_time < 86400),
    location TEXT NOT NULL,
    instructor TEXT NOT NULL,
    CHECK (start_time < end_time)
);

CREATE TABLE schedules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE schedule_selections (
    schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    semester TEXT NOT NULL,
    option_index INTEGER NOT NULL CHECK (option_index >= 0),
    PRIMARY KEY (schedule_id, course_code, semester)
);