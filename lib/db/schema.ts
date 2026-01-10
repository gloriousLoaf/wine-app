import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const wines = sqliteTable('wines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  producer: text('producer').notNull(),
  title: text('title').notNull(),
  vintage: text('vintage').notNull(), // text because of "NV"
  notes: text('notes'),
  imageTitle: text('image_title').notNull(),
  imagePath: text('image_path').notNull(),
  extImageUrl: text('ext_image_url'),
  isoCreatedAt: text('iso_created_at').notNull(),
  country: text('country'),
  grape: text('grape'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
});
