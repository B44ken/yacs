import "server-only";

type D1QueryResult<
  Row extends Record<string, unknown> = Record<string, unknown>,
> = {
  success?: boolean;
  results?: Row[];
  meta?: unknown;
};

function requireEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value?.trim()) return value;
  }
  throw new Error(`Missing env var: ${names.join("/")}`);
}

function d1Endpoint() {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID");
  const databaseId = requireEnv(
    "CLOUDFLARE_D1_DATABASE_ID",
    "CLOUDFLARE_D1_DB_ID",
    "CF_D1_DATABASE_ID",
  );
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
}

export async function d1Query<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(sql: string, params?: unknown[]): Promise<Row[]> {
  const apiToken = requireEnv("CLOUDFLARE_API_TOKEN", "CF_API_TOKEN");

  const response = await fetch(d1Endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params?.length ? { sql, params } : { sql }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: D1QueryResult<Row>[] | D1QueryResult<Row>;
  };

  if (!response.ok || payload.success === false) {
    const message =
      payload?.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join("; ") || response.statusText;
    throw new Error(message || "D1 query failed");
  }

  const result = payload.result;
  const first = Array.isArray(result) ? result[0] : result;
  return Array.isArray(first?.results) ? first.results : [];
}
