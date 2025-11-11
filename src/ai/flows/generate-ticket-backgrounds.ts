
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

    const imageUrls = media.map(m => m.url);
    
    if (!imageUrls || imageUrls.length < 3) {
      throw new Error("AI failed to generate enough images.");
    }

    return { imageUrls };
  }
);
