# yet another course scheduler

## features
- [x] static site (cloudflare pages)
- [ ] courses database (cloudflare d1)
- [ ] ai parse course from image (cloudflare workers)
- [ ] ai chat (cloudflare workers ai)

## build
`npm run dev`, then localhost:300

or `npm run build` then push to git -> cloudflare ci/cd takes over

## uploading courses to d1
1. Copy `.env.example` to `.env` (or `.env.local`) and fill in:
	- `CLOUDFLARE_ACCOUNT_ID` – shown in the Cloudflare dashboard under **Workers & Pages → Overview**.
	- `CLOUDFLARE_D1_DATABASE_ID` – your D1 database id.
	- `CLOUDFLARE_API_TOKEN` – create via **My Profile → API Tokens → Create Custom Token**, granting “Cloudflare D1 → Edit” for your account.
2. Install deps if needed: `npm install`.
3. Dry-run the uploader:

	```bash
	node adapter/upload.mjs uoft --session 20259 --code CSC258 --dry-run
	```

4. Remove `--dry-run` when you’re satisfied to write into D1.

## querying courses (D1-backed)
The Next.js app exposes `GET /api/courses` (and `?q=CSC111` prefix search) backed by Cloudflare D1.

- Required env vars at runtime:
	- `CLOUDFLARE_ACCOUNT_ID`
	- `CLOUDFLARE_D1_DATABASE_ID`
	- `CLOUDFLARE_API_TOKEN`

## exporting courses locally (json)
If you just want a local JSON snapshot (no Cloudflare credentials), use:

```bash
node adapter/export.mjs uoft --codes-file public/courses.txt
```

This writes:
- `public/ttb-courses.json`

## ai usage
used pretty heavily. `refactor this component for me`, `write this component for me`, other rudimentary code monkey tasks
