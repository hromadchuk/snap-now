<div align="center">
  <img src="logo.png" alt="Snap Now Logo" width="160" />

  # Snap Now
  ### [@snap_now_bot](https://t.me/snap_now_bot)
  **Capture moments together 📸**


  **Snap Now** is a Telegram Mini App for spontaneous photo moments in group chats. The bot sends random notifications, and participants have a limited time to take and upload a photo.
</div>

## Features
- 📸 Random photo moments in chats
- ⏱ Time-limited photo uploads
- 👥 Works in Telegram groups
- 🌍 EN / RU
- 📱 Telegram Mini App (camera, stories)

## Tech Stack

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash%20Redis-DC382D?logo=redis&logoColor=white)](https://upstash.com/)
[![Vercel Blob](https://img.shields.io/badge/Vercel%20Blob-000000?logo=vercel&logoColor=white)](https://vercel.com/docs/storage/vercel-blob)
[![Grammy](https://img.shields.io/badge/Grammy-26A5E4?logo=telegram&logoColor=white)](https://grammy.dev/)

## Getting Started

### Clone repository
```bash
git clone git@github.com:hromadchuk/snap-now.git
cd snap-now
yarn install
```

## Environment Variables

The project includes a `.env.example` file.  
Copy it and create your local environment file:

```bash
cp .env.example .env
```

## Create Telegram Bot & Get Token

1. Open Telegram and go to **[@BotFather](https://t.me/BotFather)**
2. Start the bot and create a new one: `/start` and `/newbot`
3. Enter a name and a unique username (must end with `bot`)
4. Copy the generated **Bot Token**

### Set Telegram Webhook

After deploying the app, set the Telegram webhook to your backend.

**Webhook URL:**  
`https://your-domain.vercel.app/api/telegram/webhook`

### Set webhook via Telegram Bot API
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" -H "Content-Type: application/json" -d '{"url":"https://your-domain.vercel.app/api/telegram/webhook"}'
```

### Check webhook status
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Vercel Blob Setup

1. Go to [Vercel](https://vercel.com/) and open your project
2. Navigate to **Storage → Blob**
3. Create a new **Blob Store**
4. Open the store settings and copy the **Read & Write Token**
5. Add `BLOB_READ_WRITE_TOKEN` to `.env`:

### Vercel Blob Public URL

The project contains hardcoded rewrite rules for **Vercel Blob public storage**.

You **must replace the Blob base URL** with your own. Update the URL in the following files:
  - `vercel.json`
  - `next.config.ts`

## Redis / KV (Upstash) Setup via Vercel Integrations

1. Go to your project on [Vercel](https://vercel.com/)
2. Open **Integrations**
3. Find and install **Upstash (Redis / KV)** integration
4. Copy variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`
   - `KV_URL`
   - `REDIS_URL`
