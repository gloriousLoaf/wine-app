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
    const country = formData.get('country') as string || null;
    const grape = formData.get('grape') as string || null;

    if (isNaN(id)) {
      return { success: false, message: 'Invalid wine ID' };
    }

    await db.update(wines)
      .set({ country, grape })
      .where(eq(wines.id, id));

    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to edit wine:', error);
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
