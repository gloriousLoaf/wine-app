# 🚀 Deployment Guide

This application is optimized for the **Vercel** + **Turso** stack.

## 1. Prerequisites

### Turso (Database)
1. Create a database on [Turso](https://turso.tech).
2. Get your `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`.
3. Push the schema from your local machine:
   ```bash
   npx drizzle-kit push
   ```

### Vercel (Hosting & Storage)
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Enable **Vercel Blob** in the "Storage" tab of your project. This will automatically provide the `BLOB_READ_WRITE_TOKEN`.

---

## 2. Environment Variables

Add the following to your Vercel Project Settings:

| Variable | Description |
| :--- | :--- |
| `TURSO_CONNECTION_URL` | Your Turso DB URL (libsql://...) |
| `TURSO_AUTH_TOKEN` | Your Turso Auth Token |
| `BLOB_READ_WRITE_TOKEN` | (Automatically set by Vercel Blob) |
| `ADMIN_PASSWORD` | The password for the `/admin` portal |

---

## 3. Image Migration (One-time)

If you are migrating existing local images:
1. Ensure your local `.env` has all the keys above.
2. Run the migration script:
   ```bash
   npx tsx scripts/migrate-to-blob.ts
   ```
This will upload all local images to Vercel Blob and update the database entries.

---

## 4. Admin Access

Once deployed, visit your site's `/admin` route to add new wines. Images will be uploaded directly to Vercel Blob and entries stored in Turso immediately.
