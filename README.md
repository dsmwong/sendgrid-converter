# sendgrid-converter

An HTTP proxy service that receives [SendGrid Inbound Parser](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook) webhooks (multipart/form-data), converts them to JSON, and forwards them to Twilio Functions endpoints based on the recipient email address.

## How it works

1. SendGrid delivers inbound emails as multipart/form-data POST requests to this service
2. The service looks up the recipient (`to`) email in a routing table
3. The parsed JSON body is forwarded to the matching Twilio Functions URL

Only requests with `User-Agent: Sendlib/1.0` are accepted.

## Routing table

Routes are hardcoded in `server.js`. Each entry maps a recipient email to a Twilio Functions path or full URL:

```js
{ recipient: 'you@yourdomain.com', url: '/backend/your-function' }
```

Relative paths are appended to `FUNCTIONS_DOMAIN`. Full `https://` URLs bypass the base domain entirely.

To inspect live routes: `GET /list-routes`

## Setup

### Main proxy service

Create a `.env` file in the project root:

```
FUNCTIONS_DOMAIN=your-functions-domain.twil.io
```

```bash
npm install
npm run dev      # development with auto-reload
npm start        # production
```

### Twilio Functions stub (local development)

The `twilio-functions-stub/` directory is a local Twilio Functions server for testing without deploying to Twilio.

Create `twilio-functions-stub/.env`:

```
ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=your_auth_token
SENDGRID_API_KEY=SG.xxxx
SENDER_EMAIL=your-sender@yourdomain.com
```

Start the local functions server with ngrok from the `twilio-functions-stub/` directory:

```bash
cd twilio-functions-stub
twilio serverless:start --ngrok <your-ngrok-profile>
```

This starts the local server and opens your ngrok tunnel in one command. Set `FUNCTIONS_DOMAIN` in the root `.env` (or in `fly.toml` for the deployed proxy) to your ngrok hostname.

## SendGrid Inbound Parse setup

To route inbound emails through this proxy:

**1. Add an MX record to your domain**

For the subdomain you want to receive email on (e.g. `parse.yourdomain.com`), add an MX record pointing to SendGrid:

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | `parse.yourdomain.com` | `mx.sendgrid.net` | 10 |

**2. Configure Inbound Parse in SendGrid**

In the SendGrid dashboard go to **Settings → Inbound Parse → Add Host & URL**:

- **Receiving Domain**: the subdomain you added the MX record to (e.g. `parse.yourdomain.com`)
- **Destination URL**: your deployed proxy URL (e.g. `https://your-app.fly.dev/`)
- Leave **POST the raw, full MIME message** unchecked — the proxy expects the default form-encoded payload

**3. Add routes in `routes.local.js`**

Add an entry for each recipient address you want to handle:

```js
{ recipient: 'you@parse.yourdomain.com', url: '/backend/your-function' }
```

Any email sent to `you@parse.yourdomain.com` will be forwarded as JSON to the mapped Twilio Function.

## Email provider (`assets/providers/email/sendgrid.private.js`)

`SendGridProvider` is a Twilio Functions asset available to all backend functions via `Runtime.getAssets()`. It wraps the `@sendgrid/mail` SDK and provides three methods:

- **`send(to, body, subject, options)`** — sends an outbound email. Accepts an optional `lastMessageId` in `options` to thread the reply by setting `In-Reply-To` and `References` headers and prefixing the subject with `Re:`. Also handles Twilio identity strings in the format `email:user@example.com`.

- **`parseInbound(payload)`** — parses a SendGrid inbound webhook payload (as forwarded by this proxy) into a structured object: `{ messageId, fromName, fromEmail, toEmail, text, html, subject, headers, threadData: { references, inReplyTo } }`.

- **`getThreadId(messageData)`** — returns the thread ID from parsed message data, preferring `References` over `In-Reply-To`, falling back to `messageId`.

Requires `SENDGRID_API_KEY` and `SENDER_EMAIL` in the environment.

## Deployment (Fly.io)

```bash
fly deploy
fly logs
```

The app is configured for the `syd` region with auto-start/stop machines. Update `FUNCTIONS_DOMAIN` in `fly.toml` to point to your target Twilio Functions domain.

## Testing

Send a simulated SendGrid inbound webhook:

```bash
curl -X POST https://<your-app>.fly.dev/ \
  -H "User-Agent: Sendlib/1.0" \
  -F "to=test@yourdomain.com" \
  -F "from=Your Name <you@example.com>" \
  -F "subject=Test Email" \
  -F "text=Hello, this is a test." \
  -F "headers=Message-ID: <msg-001@example.com>
From: Your Name <you@example.com>
To: test@yourdomain.com"
```
