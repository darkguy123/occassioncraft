
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MediaPart } from 'genkit';

const GenerateTicketBackgroundsInputSchema = z.string();
export type GenerateTicketBackgroundsInput = z.infer<typeof GenerateTicketBackgroundsInputSchema>;

const GenerateTicketBackgroundsOutputSchema = z.object({
  imageUrls: z.array(z.string()),
});
export type GenerateTicketBackgroundsOutput = z.infer<typeof GenerateTicketBackgroundsOutputSchema>;


export async function generateTicketBackgrounds(
  input: GenerateTicketBackgroundsInput
): Promise<GenerateTicketBackgroundsOutput> {
  return generateTicketBackgroundsFlow(input);
}


const generateTicketBackgroundsFlow = ai.defineFlow(
  {
    name: 'generateTicketBackgroundsFlow',
    inputSchema: GenerateTicketBackgroundsInputSchema,
    outputSchema: GenerateTicketBackgroundsOutputSchema,
  },
  async (eventTitle) => {
    const prompt = `Generate 3 unique, abstract, visually interesting background images for an event ticket. The event is called "${eventTitle}". The images should be suitable as a blurred background. Do not include any text. Focus on colors, gradients, and subtle textures.`;

    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 3,
      },
    });

    // Ensure media is always an array
    const mediaArray = Array.isArray(media) ? media : (media ? [media] : []);
    const imageUrls = mediaArray.map((m: MediaPart) => m.url).filter((url): url is string => !!url);
    
    if (!imageUrls || imageUrls.length < 1) { // Check for at least one image
      throw new Error("AI failed to generate any images.");
    }

    return { imageUrls };
  }
);
