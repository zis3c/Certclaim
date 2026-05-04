# Certificate Claim System

Lightweight certificate claim app for **BENGKEL FRONT-END WEB DESIGN**.
Supports both participant and committee member certificate flows.

## Pages

- `/claim` - public certificate claim page for participants and committee members
- `/admin/login` - admin password login
- `/admin` - combined recipient list, QR code, attendance, and claim open/close control

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill these values:

```env
# Participant Configuration
PARTICIPANT_GOOGLE_SHEETS_ID=
PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL=
PARTICIPANT_GOOGLE_PRIVATE_KEY=
PARTICIPANT_GOOGLE_SHEET_NAME=Form Responses 1

# Committee Configuration
COMMITTEE_GOOGLE_SHEETS_ID=
COMMITTEE_GOOGLE_SHEET_NAME=Form Responses 1
COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL=
COMMITTEE_GOOGLE_PRIVATE_KEY=

# Admin & App Configuration
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Optional distributed rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

3. Generate `ADMIN_PASSWORD_HASH` with:

```bash
npm run hash:admin-password
```

4. Share participant sheet with `PARTICIPANT_GOOGLE_SERVICE_ACCOUNT_EMAIL` as Editor.
5. Share committee sheet with `COMMITTEE_GOOGLE_SERVICE_ACCOUNT_EMAIL` as Editor.
6. Run:

```bash
npm install
npm run dev
```

## Notes

- Google Sheets are the database.
- `PARTICIPANT_GOOGLE_SHEETS_ID` is the participant sheet.
- `COMMITTEE_GOOGLE_SHEETS_ID` is optional. When set, committee records are loaded alongside participants.
- Participant sheet layout:
  A Email Address, B Timestamp, C Email, D Name, E Matric/ID, F Course, G Receipt, H Certificate Status, I Invoice Email, J Claim Status, K Claimed At, L Attendance Status, M Attended At.
- Committee sheet layout:
  A Email Address, B Timestamp, C Email, D Name, E Matric/ID, F Course, G Sijil/Certificate Status, H Claim Status, I Claimed At, J Attendance Status, K Attended At.
- The app adds `CLAIM STATUS`, `CLAIMED AT`, `ATTENDANCE STATUS`, and `ATTENDED AT` columns if missing.
- Claim open/close status is stored in a small `SETTINGS` tab.
- Eligible certificate values: `YES`, `ELIGIBLE`, `LAYAK`, `SIAP`, `APPROVED`.
- Rate limiting uses Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Without them, it falls back to in-memory limits for local/single-server use.

## GitHub Auto Deployment

The repository includes `.github/workflows/deploy.yml`. On every push to `main`, GitHub Actions will:

1. Install dependencies with `npm ci`.
2. Build the app with `npm run build`.
3. Package the build and source files.
4. Upload the archive to the server over SSH.
5. Extract it, install production dependencies, and restart the PM2 app.

Add these repository secrets in GitHub under **Settings > Secrets and variables > Actions**:

```text
DEPLOY_HOST=your_server_ip_or_domain
DEPLOY_USER=your_server_user
DEPLOY_PATH=your_app_directory_on_the_server
DEPLOY_SSH_KEY=your_private_ssh_key
PM2_APP_NAME=your_pm2_app_name
```

Keep real `.env.local`, Google service account keys, admin passwords, and server env files only on the server or in secure secret storage. They are intentionally ignored by Git.
