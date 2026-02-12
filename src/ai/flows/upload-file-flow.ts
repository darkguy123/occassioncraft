
'use server';
/**
 * @fileOverview A flow to upload a file to Firebase Storage using the Admin SDK.
 * This bypasses client-side security rules.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const UploadFileInputSchema = z.object({
  dataUri: z.string().describe("The file to upload, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  path: z.string().describe("The destination path in Firebase Storage where the file should be saved. E.g., 'public-uploads/avatars/some-user-id/profile.png'"),
});

export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

export async function uploadFile(input: UploadFileInput): Promise<string> {
  const result = await uploadFileFlow(input);
  return result.downloadUrl;
}

const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: z.object({ downloadUrl: z.string() }),
  },
  async ({ dataUri, path }) => {
    try {
      const bucket = admin.storage().bucket();
      
      // Extract content type and base64 data from data URI
      const match = dataUri.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid data URI format.');
      }
      const contentType = match[1];
      const base64Data = match[2];
      
      // Convert base64 to a buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create a reference to the file location in Storage
      const file = bucket.file(path);
      
      // Upload the buffer
      await file.save(buffer, {
        metadata: {
          contentType: contentType,
        },
      });

      // Get the public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // A very long time in the future
      });

      return { downloadUrl: url };
    } catch (error: any) {
      console.error('Firebase Admin SDK Storage Error:', error);
      throw new Error(`Failed to upload file to Firebase Storage: ${error.message}`);
    }
  }
);
