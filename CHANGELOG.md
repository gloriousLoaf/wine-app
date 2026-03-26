# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Wine App Rebuild

### Added
- **Next.js 15 (App Router)**: Migrated the framework to Next.js for SSR, optimal performance, and superior image handling with `next/image`.
- **Turso (Edge SQLite) & Drizzle ORM**: Upgraded the database layer to a globally distributed, persistent edge SQLite database.
- **Vercel Blob Storage**: Shifted ~1,000+ local and remote images to edge storage, ensuring permanent, high-performance URLs for all wines.
- **Admin Interface**: Introduced a password-protected `/admin` route utilizing Next.js Server Actions to add new wine entries and upload images directly to Vercel Blob.
- **Robust Image Resolution Data Seeder**: Built a seeder with fuzzy-matching logic to resolve naming inconsistencies and maintain remote Cloudfront fallbacks for missing local files, achieving zero broken images.
- **Minimalist Aesthetic**: Engineered a new "stark, modern" design system using Vanilla CSS and CSS Modules exclusively (zero component libraries).
- **Infinite Scroll**: Integrated a Custom Intersection Observer to incrementally load wine cards (12 at a time), guaranteeing swift initial page loads.
- **Native Dialog Components**: Used the native HTML `<dialog>` element for the wine detail view and filter module to optimize bundle size.
- **Dark/Light Mode Theme**: Added a persistent, CSS-variable-based theme switch system.
- **URL-Based State & Debounced Search**: Synchronized search and filter operations (Country, Grape, Vintage) with URL search parameters for shareable views, featuring a 500ms debounce on the sticky bottom search bar.
