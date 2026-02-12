
'use server';
/**
 * @fileOverview A flow to generate a background image.
 *
 * - generateBackgroundImage - A function that generates an image data URL from a prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateBackgroundImageInputSchema = z.string().describe("A text prompt for image generation.");
export type GenerateBackgroundImageInput = z.infer<typeof GenerateBackgroundImageInputSchema>;

export async function generateBackgroundImage(input: GenerateBackgroundImageInput): Promise<string> {
  const result = await generateBackgroundImageFlow(input);
  return result.url;
}

const generateBackgroundImageFlow = ai.defineFlow(
  {
    name: 'generateBackgroundImageFlow',
    inputSchema: GenerateBackgroundImageInputSchema,
    outputSchema: z.object({ url: z.string() }),
  },
  async (prompt) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: prompt, // The prompt is now more generic
    });
    if (!media.url) {
      throw new Error('Image generation failed to return a URL.');
    }
    return { url: media.url };
  }
);
