# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Node.js proxy service that:
1. Receives SendGrid Inbound Parser webhook requests (multipart/form-data)
2. Converts them to JSON
3. Routes them to Twilio Functions endpoints based on the recipient email address

## Commands

```bash
# Install dependencies
npm install

# Run in development (with auto-reload)
npm run dev

# Run in production
npm start
```

### Environment Setup

Create a `.env` file at the project root:
```
FUNCTIONS_DOMAIN=<your-twilio-functions-domain>
```

`FUNCTIONS_DOMAIN` is required — the server exits on startup if it's missing.

### Deployment (Fly.io)

```bash
fly deploy
fly logs
```

The app deploys to `syd` region. `FUNCTIONS_DOMAIN` in `fly.toml` points to the ngrok tunnel for the Twilio Functions backend.

## Architecture

### Main Service (`server.js`)

Single-file Fastify server with one catch-all route (`fastify.all('*')`).

**Request flow:**
1. `preHandler` hook validates `User-Agent: Sendlib/1.0` — all other agents get a 400
2. Catch-all handler looks up `request.body.to` (recipient email) in the `routes` array
3. If a route path starts with `https://`, it's used as a full URL; otherwise it's appended to `FORWARD_TO_BASE`
4. Request body is forwarded as JSON via axios with Content-Type changed from multipart to application/json

**Routing table** (hardcoded in `server.js`):
- Maps recipient email addresses to Twilio Functions paths or full URLs
- `GET /list-routes` returns the current routing table and base URL (bypasses User-Agent check)

### Twilio Functions Stub (`twilio-functions-stub/`)

A local `twilio-run` development server that stubs out Twilio Functions endpoints for local testing. Functions live under `functions/backend/`. Currently contains only `test-endpoint.js`.

To run the stub locally:
```bash
cd twilio-functions-stub
npm install
twilio serverless:start --ngrok dawong
```
