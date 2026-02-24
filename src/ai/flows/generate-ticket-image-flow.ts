
'use server';
/**
 * @fileOverview A flow to generate a background image and return its data URI.
 *
 * - generateBackgroundImage - A function that generates an image and returns its data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateBackgroundImageInputSchema = z.string().describe("A text prompt for image generation.");
export type GenerateBackgroundImageInput = z.infer<typeof GenerateBackgroundImageInputSchema>;

export async function generateBackgroundImage(input: GenerateBackgroundImageInput): Promise<string> {
  // The flow now returns the data URI string directly.
  return await generateBackgroundImageFlow(input);
}

const generateBackgroundImageFlow = ai.defineFlow(
  {
    name: 'generateBackgroundImageFlow',
    inputSchema: GenerateBackgroundImageInputSchema,
    // The flow now directly returns a string (the data URI).
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

    // 2. Return the data URI directly to the client.
    return media.url;
  }
);
