# cPanel production deployment

This folder is a single Node.js application. `app.js` starts Express, which serves
the compiled React application from `public/`, the API at `/api`, and local assets
at `/uploads`. Deploy at the domain root (`/`); subdirectory hosting needs a new
frontend build and routing configuration. No frontend build is needed on cPanel.

## Hosting requirements

- cPanel Node.js/Passenger support (Application Manager or Setup Node.js App).
  Use a supported Node.js 22 or 24 runtime. PHP-only hosting cannot run this app.
- A reachable MongoDB database; cPanel MySQL is not a substitute. Configure the
  database network allowlist for the hosting server and a restricted database user.
- HTTPS, working SMTP credentials, and Cloudinary credentials for uploads.
- Outbound access to MongoDB, SMTP, Cloudinary and optionally SMS.BD.

## Upload and configure

1. Upload the **contents** of this folder to `/home/CPANEL_USER/jmds-app`, outside
   `public_html`. Include hidden files. Keep the backend and credentials private.
2. Register a Node.js application in cPanel with application root `jmds-app`,
   application URL `https://jmdschool.com/`, production mode, startup file `app.js`.
   cPanel generates the host-specific Passenger configuration; do not replace it
   with a generic .htaccess. Do not copy the entire backend into public_html.
3. Copy `.env.example` to `.env` in the application root and fill in actual values,
   or set them through cPanel's application environment interface. Environment
   variables override .env. CLIENT_URL is preset to
   `https://jmdschool.com,http://jmdschool.com`. Both requested origins are allowed;
   optional trailing slashes are normalized for CORS. Keep HTTPS as the public URL
   and enable cPanel's HTTP-to-HTTPS redirect. Separate additional origins with commas. Generate a
   JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   Never place secrets under `public/`. Restrict `.env` permissions to 600.
4. In the host's Node.js environment, from the application root run
   `npm ci --omit=dev`. Required runtime dependencies install on Linux; local
   Windows node_modules are intentionally excluded. If only a cPanel install
   button is available, use it; this package contains no development dependencies.
5. Run `npm run check:config`, then restart through cPanel. Do not run a second
   background npm/PM2 server alongside Passenger. Enable HTTPS redirection in
   cPanel and verify the certificate before accepting users.
6. For a new database, temporarily set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE and
   a unique ADMIN_PASSWORD of at least 12 characters, then run
   `npm run create:admin`. Remove bootstrap variables afterward. This command
   refuses to run if an administrator exists; it never installs default accounts.

## Database connection troubleshooting

Uploading `.env.example` alone does not configure the application: it is not
loaded. Create `.env` beside `app.js` or set `MONGODB_URI` in the cPanel Node.js
application environment. Use the Atlas connection string with the database name
`jmds_tms`; replace the database username and password and percent-encode special
characters in credentials. Never upload actual credentials inside `public/`.

From the application root in cPanel's Node.js environment, run:

```sh
npm run check:db
npm run check:config
```

`check:db` makes a read-only database connection and ping without changing data.
It runs independently of SMTP and Cloudinary configuration, prints no credentials,
and identifies configuration, authentication, DNS, TLS, or connectivity errors.
Hosting environment variables override `.env`; update both if an old URI exists.
Restart the cPanel application after changing values.

- `DB_CONFIG_MISSING`: create `.env` or set MONGODB_URI in cPanel.
- `DB_CONFIG_INVALID`: replace placeholders and check the URI format.
- `DB_AUTH_FAILED`: check the Atlas database user and password, rather than your
  Atlas account login; check authSource for self-hosted MongoDB.
- `DB_DNS_FAILED`: verify the cluster hostname and hosting DNS. If your host cannot
  resolve SRV records, obtain the standard `mongodb://` URI from Atlas; do not
  simply remove `+srv` from the URI.
- `DB_TLS_FAILED`: have your host check certificates, Node.js and system time.
- `DB_CONNECTION_FAILED`: add the cPanel server's **outbound public IP** to Atlas
  Network Access, ensure the cluster is running, and ask the host to permit
  outbound connections to the MongoDB cluster. Your home IP or the website's
  inbound IP may differ from the hosting server's outbound IP.

The application uses MongoDB, not cPanel MySQL. Files cannot fix an Atlas access
list or a hosting firewall; those settings must be corrected on the respective
services. After restarting, `/api/health` must return `database: connected`.

When updating the host, replace the application code and package files, preserve
your `.env`, `uploads/`, and cPanel-generated Passenger settings, run
`npm ci --omit=dev`, and restart the Node.js app. Do not extract old nested ZIPs.

Reference: https://www.mongodb.com/docs/atlas/troubleshoot-connection/

## Database data and verification

Database records are not part of the upload. Back up and restore your existing
MongoDB database separately when moving hosts. Preserve `uploads/` on updates
and retain existing Cloudinary assets. Do not run development or demo seeders
against production. For an existing database, review enrollment indexes against
`server/seeders/enrollmentIndexMigration.js` in the source project before migrating;
back up first, because that migration changes database indexes.

Verify `/api/health` returns 200 with `database: connected`; 503 means the database
is unavailable. Check a direct `/login` and dashboard reload, an unknown API route
(JSON 404), login, email verification, upload and certificate download. Test SMS
with your own number if enabled. Confirm private paths such as `/.env` and
`/package.json` do not expose files. Check cPanel's application logs for errors.

Registration limits are per process. Configure TRUST_PROXY only for the actual
proxy topology supplied by your host so per-client IP limits work. Multi-process
hosting requires a shared gateway rate limit. Back up MongoDB and local uploads,
keep the previous deployment for rollback, and monitor health and delivery errors.

Login, OTP verification and password recovery share a 30-request/15-minute limit
per IP per process. The frontend and backend must be uploaded together because
certificate verification now requires the signed, five-minute captcha challenge
returned by the backend. Private user profiles are limited to their owner or an
administrator; instructors can read only their assigned enrollments. Certificate
downloads and previews are limited to administrators and the owning student.

The package has been checked locally with automated frontend/backend tests,
a production build, file hash verification and an HTTP smoke test. The HTTP smoke
test mocks MongoDB and email. Real hosting, MongoDB access, SMTP delivery,
Cloudinary uploads and optional SMS still require the checks above after upload.

`manifest.json` lists packaged files and SHA-256 hashes. No local .env, tests,
frontend source, source maps, node_modules, demo seeders or old archives are shipped.
The production frontend uses `/api`, so changing the domain requires updating
CLIENT_URL rather than rebuilding the browser bundle.

## Rebuild from source

From the source repository run `npm run package:deployment`. This rebuilds the
frontend with REACT_APP_API_URL=/api, GENERATE_SOURCEMAP=false and PUBLIC_URL=/
before copying runtime files. Move any previous Deployment folder aside
first; packaging refuses to overwrite hosting configuration. Keep .env and uploads
from the deployed server when replacing application files.

After packaging, run `npm run verify:deployment` from the source repository to
verify the file inventory, hashes, production lockfile, and frontend assets.
SMTP certificates are verified; configure a valid certificate on your mail server.

## Folder contents

```text
Deployment/
  app.js                 Passenger startup file
  server.js              Express API and frontend server
  package.json           Production dependency and command definitions
  package-lock.json      Locked runtime dependencies
  .env.example           Configuration template; fill in on the host
  public/                Compiled frontend, logos, images, CSS and JavaScript
  config/                Database and production validation
  controllers/           API handlers
  middleware/            Authentication, validation and error handling
  models/                MongoDB schemas
  routes/                API routes
  utils/                 Email, SMS, uploads and PDF services
  assets/                Certificate artwork
  scripts/createAdmin.js First administrator bootstrap
  uploads/               Local assets; preserve during updates
  tmp/                   Passenger restart directory
  manifest.json          File inventory with SHA-256 checksums
  README.md              These deployment instructions
  LICENSE                Project license
```

Do not upload the repository's `client/`, `server/`, development dependencies,
tests, or old ZIP archives. Everything to upload is inside `Deployment/`.

Official hosting references:
- https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/
- https://docs.cpanel.net/cpanel/software/application-manager/
