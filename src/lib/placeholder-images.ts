
// This file is now obsolete as images are served from the /public directory.
// Keeping it to avoid breaking imports, but it will be empty.
export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = [];
