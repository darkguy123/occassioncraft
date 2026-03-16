'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

type BackgroundImage = {
  id: string;
  url: string;
};

export default function AdminBackgroundsPage() {
  const { toast } = useToast();
  const { storage, user } = useFirebase();
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!storage) return;

    const fetchBackgrounds = async () => {
      setIsLoading(true);
      try {
        const storageRef = ref(storage, 'public-uploads/admin-assets/ticket-backgrounds');
        const listResult = await listAll(storageRef);
        
        const backgroundPromises = listResult.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { id: item.name, url };
        });

        const results = await Promise.all(backgroundPromises);
        setBackgrounds(results);
      } catch (error) {
        console.error("Error fetching backgrounds:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBackgrounds();
  }, [storage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please upload an image file.' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(file);
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!newImage || !storage) return;

    setIsUploading(true);
    try {
      const fileName = `${uuidv4()}-${newImage.name}`;
      const storageRef = ref(storage, `public-uploads/admin-assets/ticket-backgrounds/${fileName}`);
      
      const uploadResult = await uploadBytes(storageRef, newImage);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      const newBackground: BackgroundImage = {
        id: fileName,
        url: downloadURL,
      };

      setBackgrounds(prev => [newBackground, ...prev]);
      setNewImage(null);
      setPreview(null);
      
      toast({
        title: 'Background Uploaded',
        description: 'The new background has been added to the library.',
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed', 
        description: error.message || 'Could not upload image.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (bg: BackgroundImage) => {
    if (!storage) return;

    try {
      const storageRef = ref(storage, `public-uploads/admin-assets/ticket-backgrounds/${bg.id}`);
      await deleteObject(storageRef);
      
      setBackgrounds(prev => prev.filter(item => item.id !== bg.id));
      toast({
        title: 'Background Removed',
        description: 'The background has been deleted from the library.',
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete image.' });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ticket Backgrounds</h1>
        <p className="text-muted-foreground">Manage the library of background images available for event tickets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Background</CardTitle>
          <CardDescription>Upload a new image to the ticket background library.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="background-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative overflow-hidden">
              {preview ? (
                <Image src={preview} alt="Background preview" layout="fill" objectFit="cover" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 2MB, Recommended 2:3 ratio)</p>
                </div>
              )}
              <Input id="background-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
            </label>
          </div>
          {preview && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPreview(null); setNewImage(null); }} disabled={isUploading}>Cancel</Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : 'Save Background'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Background Library</CardTitle>
            <CardDescription>The following images are available for vendors to use.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
                    ))}
                </div>
            ) : backgrounds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {backgrounds.map(bg => (
                        <div key={bg.id} className="relative group aspect-[2/3]">
                            <Image src={bg.url} alt="Ticket Background" layout="fill" className="object-cover rounded-md" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(bg)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                    <p>No backgrounds have been uploaded yet.</p>
                </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
