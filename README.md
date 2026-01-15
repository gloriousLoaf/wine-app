# 🍷 Untitled Wine App

A minimalist, high-performance wine collection tracker built with Next.js, Turso, and Vercel Blob. 

## ✨ Features
- **Stark Minimalist Design**: Vanilla CSS with zero component libraries.
- **Global Search & Filter**: Instant filtering by Country, Grape, and Vintage.
- **Edge-Powered**: Uses Turso (SQLite) and Vercel Blob for global performance.
- **Admin Interface**: Add new bottles with direct-to-cloud image uploads.
- **Infinite Scroll**: Optimized wine grid for smooth browsing of 1100+ entries.

## 🛠️ Tech Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [Turso](https://turso.tech/) (SQLite on the Edge)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: [Vercel Blob](https://vercel.com/storage/blob)
- **Styling**: Vanilla CSS Modules

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file with the following:
```env
TURSO_CONNECTION_URL=your_turso_url
TURSO_AUTH_TOKEN=your_turso_token
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
ADMIN_PASSWORD=your_admin_password
```

### 3. Development
```bash
npm run dev
```

## 📦 Deployment

This app is designed to be deployed on **Vercel**.

1. Connect your repository to Vercel.
2. Add the environment variables listed above to your Vercel project settings.
3. Push your code to `main`.

For more detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---
*Created with care by a former sommelier.*
