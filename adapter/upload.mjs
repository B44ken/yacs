#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.local", ".env"];
const WRANGLER_CONFIG = "wrangler.jsonc";

const PROVIDERS = {
    uoft: () => import("./uoft/adapter.mjs"),
};

function printUsage() {
    console.log(`Usage: node adapter/upload.mjs <provider> [options]

Providers:
  uoft                 University of Toronto timetable adapter

Options:
  --session <code>     Semester identifier to store (e.g. 20259)
  --code <code>        Course code to fetch (repeatable)
  --codes <csv>        Comma separated list of course codes
  --codes-file <path>  File with one course code per line
  --sessions <csv>     Override timetable API session filter (defaults to --session)
  --divisions <csv>    Override timetable API division list (default: ARTSC,APSC)
  --page-size <n>      Fetch page size (default 50)
    --search-by <mode>   How to query the timetable API (code|title, default code)
  --dry-run            Fetch and print a summary without writing to D1
  --help               Show this message
`);
}

function parseCsv(value = "") {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function readCodesFromFile(filePath) {
    if (!filePath) {
        return [];
    }
    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
    const contents = fs.readFileSync(absolutePath, "utf8");
    return contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function loadEnvFiles() {
    for (const filename of ENV_FILES) {
        const filePath = path.resolve(process.cwd(), filename);
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const contents = fs.readFileSync(filePath, "utf8");
        for (const line of contents.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const eqIndex = trimmed.indexOf("=");
            if (eqIndex === -1) {
                continue;
            }

            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (!key || process.env[key] != null) {
                continue;
            }

            const unquoted = value.replace(/^['"]|['"]$/g, "");
            process.env[key] = unquoted;
        }
    }
}

function hydrateFromWranglerConfig() {
    const filePath = path.resolve(process.cwd(), WRANGLER_CONFIG);
    if (process.env.CLOUDFLARE_D1_DATABASE_ID || !fs.existsSync(filePath)) {
        return;
    }

    try {
        const contents = fs.readFileSync(filePath, "utf8");
        const config = JSON.parse(contents);
        const databases = Array.isArray(config?.d1_databases) ? config.d1_databases : [];
        const databaseId = databases[0]?.database_id;
        if (databaseId) {
            process.env.CLOUDFLARE_D1_DATABASE_ID = databaseId;
        }
    } catch (error) {
        console.warn(`Warning: unable to read ${WRANGLER_CONFIG}: ${error.message}`);
    }
}

function parseFlags(argv) {
    const args = { codes: [], sessions: [], divisions: [], dryRun: false };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--help") {
            args.help = true;
            continue;
        }

        if (!token.startsWith("--")) {
            throw new Error(`Unexpected argument '${token}'. Put all positional arguments before options.`);
        }

        const key = token.slice(2);
        const value = argv[i + 1];
        if (value == null) {
            throw new Error(`Missing value for --${key}`);
        }
        i += 1;

        switch (key) {
            case "session":
                args.session = value.trim();
                break;
            case "code":
                args.codes.push(value.trim());
                break;
            case "codes":
                args.codes.push(...parseCsv(value));
                break;
            case "codes-file":
                args.codes.push(...readCodesFromFile(value));
                break;
            case "sessions":
                args.sessions.push(...parseCsv(value));
                break;
            case "divisions":
                args.divisions.push(...parseCsv(value));
                break;
            case "page-size":
                args.pageSize = Number.parseInt(value, 10);
                if (Number.isNaN(args.pageSize) || args.pageSize <= 0) {
                    throw new Error("--page-size must be a positive integer");
                }
                break;
            case "search-by":
                args.searchBy = value.trim();
                break;
            default:
                throw new Error(`Unsupported option --${key}`);
        }
    }

    return args;
}

function requireEnv(name, fallbackNames = []) {
    const envNames = [name, ...fallbackNames];
    for (const envName of envNames) {
        if (process.env[envName]) {
            return process.env[envName];
        }
    }
        throw new Error(`Missing ${envNames.join("/")} environment variable.`);
}

function createD1Client() {
    const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID", ["CF_ACCOUNT_ID"]);
    const databaseId = requireEnv("CLOUDFLARE_D1_DATABASE_ID", ["CLOUDFLARE_D1_DB_ID", "CF_D1_DATABASE_ID"]);
    const apiToken = requireEnv("CLOUDFLARE_API_TOKEN", ["CF_API_TOKEN"]);
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

    return {
        async run(statements) {
            const rawStatements = Array.isArray(statements) ? statements : [statements];
            const normalized = rawStatements
                .filter(Boolean)
                .map((statement, index) => {
                    const sql = statement?.sql;
                    if (typeof sql !== "string" || sql.trim() === "") {
                        throw new Error(`D1 query failed: statement ${index} is missing a valid sql string.`);
                    }

                    const params = Array.isArray(statement?.params) ? statement.params : undefined;
                    return params && params.length > 0 ? { sql, params } : { sql };
                });

            if (normalized.length === 0) {
                throw new Error("D1 query failed: at least one SQL statement is required.");
            }

            const bodyPayload =
                normalized.length === 1 && !normalized[0].params
                    ? { sql: normalized[0].sql }
                    : normalized.length === 1
                      ? { sql: normalized[0].sql, params: normalized[0].params }
                      : { statements: normalized };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bodyPayload),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.success === false) {
                const message = payload?.errors?.map((error) => error.message).join("; ") || response.statusText;
                throw new Error(`D1 query failed: ${message}`);
            }

            const result = payload.result ?? [];
            if (normalized.length === 1) {
                return Array.isArray(result) ? result : [result];
            }

            return result;
        },
    };
}

async function ensureSchema(client) {
    const [tableLookup] = await client.run({
        sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        params: ["courses"],
    });

    const hasCoursesTable = Array.isArray(tableLookup?.results) && tableLookup.results.length > 0;
    if (hasCoursesTable) {
        return;
    }

    const schemaPath = path.resolve(process.cwd(), "stuff/schema.sql");
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const contents = fs.readFileSync(schemaPath, "utf8");
    const statements = contents
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.trim())
        .filter(Boolean);

    if (statements.length === 0) {
        throw new Error("Schema file is empty.");
    }

    for (const sql of statements) {
        try {
            await client.run({ sql });
        } catch (error) {
            const message = String(error?.message ?? "");
            if (!/already exists/i.test(message)) {
                throw error;
            }
        }
    }
}

async function selectSingleId(client, sql, params, field = "id") {
    const [result] = await client.run([{ sql, params }]);
    const [row] = result?.results ?? [];
    return row?.[field] ?? null;
}

async function uploadCourse(client, course) {
    await client.run([
        {
            sql: "DELETE FROM courses WHERE code = ? AND semester = ?",
            params: [course.code, course.semester],
        },
    ]);

    await client.run([
        {
            sql: "INSERT INTO courses (code, semester, title) VALUES (?, ?, ?)",
            params: [course.code, course.semester, course.title],
        },
    ]);

    const courseId = await selectSingleId(
        client,
        "SELECT id FROM courses WHERE code = ? AND semester = ?",
        [course.code, course.semester],
    );

    if (!courseId) {
        throw new Error(`Failed to resolve course id for ${course.code}`);
    }

    for (let index = 0; index < course.options.length; index += 1) {
        const option = course.options[index];
        const optionNumber = typeof option.number === "number" ? option.number : index;

        await client.run([
            {
                sql: "INSERT INTO options (course_id, option_number) VALUES (?, ?)",
                params: [courseId, optionNumber],
            },
        ]);

        const optionId = await selectSingleId(
            client,
            "SELECT id FROM options WHERE course_id = ? AND option_number = ?",
            [courseId, optionNumber],
        );

        if (!optionId) {
            throw new Error(`Failed to resolve option id for ${course.code} option ${optionNumber}`);
        }

        for (const lecture of option.lectures) {
            if (!lecture || !lecture.day) {
                continue;
            }

            await client.run([
                {
                    sql: "INSERT INTO lectures (option_id, section, day, start_time, end_time, location, instructor) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    params: [
                        optionId,
                        lecture.section ?? 0,
                        lecture.day,
                        lecture.start,
                        lecture.end,
                        lecture.location,
                        lecture.instructor,
                    ],
                },
            ]);
        }
    }
}

async function main() {
    const argv = process.argv.slice(2);
    if (argv.length === 0) {
        printUsage();
        process.exit(1);
    }

    const providerKey = argv.shift();
    const providerLoader = PROVIDERS[providerKey];
    if (!providerLoader) {
        console.error(`Unknown provider '${providerKey}'.`);
        printUsage();
        process.exit(1);
    }

    let parsed;
    try {
        parsed = parseFlags(argv);
    } catch (error) {
        console.error(error.message);
        printUsage();
        process.exit(1);
    }

    if (parsed.help) {
        printUsage();
        process.exit(0);
    }

    if (!parsed.session) {
        console.error("--session is required.");
        process.exit(1);
    }

    if (!Array.isArray(parsed.codes) || parsed.codes.length === 0) {
        console.error("Provide at least one course code using --code, --codes, or --codes-file.");
        process.exit(1);
    }

    const adapter = await providerLoader();
    const courses = await adapter.getCourses({
        codes: parsed.codes,
        session: parsed.session,
        sessions: parsed.sessions,
        divisions: parsed.divisions,
        pageSize: parsed.pageSize,
        searchBy: parsed.searchBy,
    });

    if (courses.length === 0) {
        console.warn("No courses returned from adapter.");
        process.exit(0);
    }

    if (parsed.dryRun) {
        console.log(`Fetched ${courses.length} course(s):`);
        for (const course of courses) {
            console.log(`- ${course.code} (${course.semester}) → ${course.options.length} option(s)`);
        }
        process.exit(0);
    }

    loadEnvFiles();
    hydrateFromWranglerConfig();
    const client = createD1Client();
    await ensureSchema(client);
    for (const course of courses) {
        await uploadCourse(client, course);
        console.log(`Uploaded ${course.code} (${course.semester})`);
    }

    console.log(`Done. Uploaded ${courses.length} course(s).`);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});