# Jahanabad Military Driving School TMS

Training management system for Jahanabad Military Driving School. The project is split into a React client and an Express/MongoDB API.

## Project Structure

```text
.
+-- client/                 React frontend application
|   +-- public/             Static browser assets copied as-is
|   |   +-- logos/          Footer recognition logos
|   +-- src/
|       +-- assets/         App images, video, and bundled media
|       +-- components/     Shared UI components
|       +-- context/        React context providers
|       +-- pages/          Public, auth, and dashboard pages
|       +-- utils/          API clients and frontend helpers
+-- server/                 Express backend application
|   +-- assets/             Backend-only static assets, such as certificate logos
|   +-- config/             Database configuration
|   +-- controllers/        Request handlers
|   +-- middleware/         Auth and error middleware
|   +-- models/             Mongoose models
|   +-- routes/             API route definitions
|   +-- seeders/            Database seed and migration scripts
|   +-- uploads/            Local runtime uploads, ignored by git
|   +-- utils/              Shared backend utilities
+-- docs/                   Project reference assets and lightweight docs
|   +-- assets/notices/     Source images used by notice seeders
+-- package.json            Root scripts for installing, running, and seeding
```

## Common Commands

Before starting, copy `server/.env.example` to `server/.env` and
`client/.env.example` to `client/.env`. Set the MongoDB connection string,
a random JWT secret, SMTP credentials, and Cloudinary credentials in
`server/.env`. Keep secrets out of the client environment.

Run `npm run server` and `npm run client` in separate terminals. Open
http://localhost:3000. The API runs at http://localhost:5000/api;
`/api/health` returns HTTP 200 when MongoDB is connected and HTTP 503 otherwise.
Restart the corresponding service after changing an environment file.

SMTP port 465 uses implicit TLS. Email workflows require valid SMTP credentials;
image uploads require valid Cloudinary credentials. Seed commands write to the
configured database, so only run them when you intend to change its data.

The current code hardcodes a six-character captcha, a ten-minute OTP lifetime,
and a 5 MB upload limit. It reads CORS origins from `CLIENT_URL`.
`CAPTCHA_LENGTH`, `OTP_EXPIRE_MINUTES`, `MAX_FILE_SIZE`, `CORS_ORIGINS`, and
`USE_PASSENGER` from a hosting configuration are not read by this application.

```bash
npm run install-all
npm run server
npm run client
npm run seed
npm run seed:notices
```

## Notes

### Production deployment

The generated `Deployment/` folder contains the Node.js backend, compiled React
frontend, runtime dependency lockfile, production environment template and cPanel
instructions. See [the cPanel guide](docs/CPANEL.md). Upload this application outside
`public_html` and register it with cPanel's Node.js application manager using
`app.js`. Set real hosting credentials and install runtime dependencies on the host.

To regenerate, move the previous `Deployment` folder aside, then run
`npm run package:deployment`. This builds the frontend with production settings
and packages the current backend. The script preserves existing deployment
configuration by refusing to overwrite an existing folder.

### Registration SMS verification

Registration sends the same OTP by email and SMS. Entering that code from either
channel completes registration; users do not need to enter two codes. This confirms
access to at least one delivery channel, rather than independently proving access
to both the email address and phone number.
Use Node.js 18 or newer. Set `SMS_BD_API_KEY` in `server/.env` using the key
from your SMS.BD panel's API page. Optionally set `SMS_BD_SENDER_ID` to an approved
sender ID; omit it to use the account default. Restart the server after configuring
these values. The integration uses the [SMS.BD API](https://sms.bd/api), posting
JSON to `https://api.sms.net.bd/sendsms`. Ensure the account has SMS credit.
Email delivery is required. SMS is best effort: missing SMS credentials, an expired
SMS.BD account, provider errors or an SMS that never arrives do not prevent
registration using the email code. The API returns `smsAccepted: false` when the
SMS request fails, and the verification screen directs users to their email.
Provider acceptance does not guarantee handset delivery. Verification checks the
shared OTP and expiry, independently of SMS status; it does not mark the phone
as independently verified.

`POST /api/auth/verify-otp` requires `{ email, otp }`. The shared code expires
after 10 minutes and can only be used once. Five verification attempts are allowed
per code; resending replaces the code in both channels
and resets attempts after a 60-second cooldown. Registration and resend share a
10-request/hour limit per IP in each server process. For multiple instances, enforce
a shared limit at the gateway; configure Express's trusted proxy setting for your
actual proxy topology before relying on per-client IP limits behind a proxy.

Existing verified accounts retain access. Pending accounts from before this change
must request a new shared code. Signing in to a pending account opens the verification form,
where the user can request the shared code and finish registration.

To smoke-test delivery, register with an inbox and Bangladesh mobile number you
control, confirm that the email and SMS contain the same code and that an incorrect or
missing code cannot activate the account, then enter the code from either channel. Confirm login succeeds only after verification.
Automated tests mock SMS.BD; they do not send real SMS messages.

- Runtime files such as `node_modules/`, build output, npm cache, local `.env` files, and `server/uploads/` are intentionally ignored.
- Keep source code in `client/src` and `server`; keep documentation or seed reference assets in `docs`.
- Do not commit real credentials. Use local `.env` files and share safe examples only.

### Certificate numbering

New certificates use `JMDS-YYYY-NNNNNNNN`, starting at `00000404` with one continuous serial sequence across all years. Only the year segment changes at calendar rollover in `Asia/Dhaka`. Configure `CERTIFICATE_SERIAL_START` and `CERTIFICATE_TIME_ZONE` in the backend environment. Existing certificate IDs are preserved. One atomic global MongoDB counter reserves each serial; failed certificate saves may leave gaps, and reserved numbers are never reused. The allocator ensures the unique certificate ID index before issuing IDs and continues above the highest assigned serial across all years in the same format. Index creation fails safely if historical duplicate IDs exist; resolve those explicitly before issuing new certificates. Repackage the Deployment directory from source before publishing these changes.
