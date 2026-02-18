
'use server';
/**
 * @fileOverview A flow to generate a background image, upload it, and return a public URL.
 *
 * - generateBackgroundImage - A function that generates an image and returns its public storage URL.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { uploadFile } from './upload-file-flow';
import { v4 as uuidv4 } from 'uuid';

const GenerateBackgroundImageInputSchema = z.string().describe("A text prompt for image generation.");
export type GenerateBackgroundImageInput = z.infer<typeof GenerateBackgroundImageInputSchema>;

export async function generateBackgroundImage(input: GenerateBackgroundImageInput): Promise<string> {
  // The flow now returns the public URL string directly.
  return await generateBackgroundImageFlow(input);
}

const generateBackgroundImageFlow = ai.defineFlow(
  {
    name: 'generateBackgroundImageFlow',
    inputSchema: GenerateBackgroundImageInputSchema,
    // The flow now directly returns a string (the URL).
    outputSchema: z.string(),
  },
  async (prompt) => {
    // 1. Generate the image from the AI model
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: prompt,
    });
    if (!media.url) {
      throw new Error('Image generation failed to return a data URI.');
    }

    // 2. Upload the generated image data to Firebase Storage
    const dataUri = media.url;
    // Use a unique name for the file to prevent collisions
    const imagePath = `public-uploads/event-banners/banner-${uuidv4()}.png`;

    try {
      const downloadUrl = await uploadFile({
        dataUri: dataUri,
        path: imagePath,
      });
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading generated banner:", error);
      throw new Error("Failed to upload generated banner image to storage.");
    }
  }
);
