
'use server';
/**
 * @fileOverview A flow to generate an image for a ticket background.
 *
 * - generateTicketImage - A function that generates an image data URL from a prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTicketImageInputSchema = z.string().describe("A simple text prompt for image generation, like 'abstract gradient'.");
export type GenerateTicketImageInput = z.infer<typeof GenerateTicketImageInputSchema>;

export async function generateTicketImage(input: GenerateTicketImageInput): Promise<string> {
  const result = await generateTicketImageFlow(input);
  return result.url;
}

const generateTicketImageFlow = ai.defineFlow(
  {
    name: 'generateTicketImageFlow',
    inputSchema: GenerateTicketImageInputSchema,
    outputSchema: z.object({ url: z.string() }),
  },
  async (prompt) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a visually appealing, high-quality event ticket background based on the following theme: ${prompt}. The image should be abstract and suitable for a background. Avoid text and logos. Aspect ratio 2:3.`,
      config: {
        // You can add more config here if needed, like aspect ratio
      }
    });
    if (!media.url) {
      throw new Error('Image generation failed to return a URL.');
    }
    return { url: media.url };
  }
);
