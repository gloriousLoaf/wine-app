'use server';

import { db } from '../../lib/db';
import { wines } from '../../lib/db/schema';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';

export async function editWineMetadata(formData: FormData) {
  try {
    const password = formData.get('password') as string;
    if (password !== process.env.ADMIN_PASSWORD) {
      return { success: false, message: 'Unauthorized: Incorrect password' };
    }

    const id = parseInt(formData.get('id') as string, 10);
    const title = formData.get('title') as string | null;
    const producer = formData.get('producer') as string | null;
    const vintage = formData.get('vintage') as string | null;
    const notes = formData.get('notes') as string | null;
    const country = formData.get('country') as string | null;
    const grape = formData.get('grape') as string | null;
    const datePosted = formData.get('datePosted') as string | null;

    if (isNaN(id)) {
      return { success: false, message: 'Invalid wine ID' };
    }

    if (!title || !producer || !vintage || !datePosted) {
      return { success: false, message: 'Missing required string fields.' };
    }

    await db.update(wines)
      .set({ 
        title, 
        producer, 
        vintage, 
        notes: notes || null, 
        country, 
        grape, 
        datePosted 
      })
      .where(eq(wines.id, id));

    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to edit wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
}

export async function deleteWine(formData: FormData) {
  try {
    const password = formData.get('password') as string;
    if (password !== process.env.ADMIN_PASSWORD) {
      return { success: false, message: 'Unauthorized: Incorrect password' };
    }

    const id = parseInt(formData.get('id') as string, 10);
    if (isNaN(id)) {
      return { success: false, message: 'Invalid wine ID' };
    }

    // Hard delete from DB. (Images in Vercel Blob are kept as orphans for simplicity, or we could delete them if we stored the URL string. Leaving Blob deletion out to prevent accidental wipe of shared assets).
    await db.delete(wines).where(eq(wines.id, id));

    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
}

export async function addWine(formData: FormData) {
  try {
    const password = formData.get('password') as string;
    if (password !== process.env.ADMIN_PASSWORD) {
      return { success: false, message: 'Unauthorized: Incorrect password' };
    }

    const producer = formData.get('producer') as string;
    const title = formData.get('title') as string;
    const vintage = formData.get('vintage') as string;
    const notes = formData.get('notes') as string;
    const country = formData.get('country') as string || null;
    const grape = formData.get('grape') as string || null;
    const imageFile = formData.get('imageFile') as File;

    let imagePath = '';
    let imageTitle = '';

    if (imageFile && imageFile.size > 0) {
      const blob = await put(imageFile.name, imageFile, {
        access: 'public',
      });
      imagePath = blob.url;
      imageTitle = imageFile.name;
    }

    await db.insert(wines).values({
      producer,
      title,
      vintage,
      notes,
      country,
      grape,
      imageTitle,
      imagePath,
      isoCreatedAt: new Date().toISOString(),
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to add wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred during upload.' };
  }
}
