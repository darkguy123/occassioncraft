
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import backgroundsData from '@/lib/ticket-backgrounds.json';

type BackgroundImage = {
  id: string;
  url: string;
};

export default function AdminBackgroundsPage() {
  const { toast } = useToast();
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, this would be fetched. For this demo, we use a JSON file
    // and manage state on the client. We'll simulate fetching.
    setBackgrounds(backgroundsData.backgrounds);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

  const handleUpload = () => {
    if (!preview) return;

    // This is a simulation. In a real app, you would upload the file to Firebase Storage,
    // get the URL, and then save that URL to your database or JSON file on the server.
    // Since we cannot write to the filesystem, we'll just update the local state.
    const newBackground: BackgroundImage = {
      id: `bg-${Date.now()}`,
      url: preview,
    };

    setBackgrounds(prev => [newBackground, ...prev]);
    setNewImage(null);
    setPreview(null);
    
    toast({
      title: 'Background Added (Simulated)',
      description: 'The new background has been added to the local list. A real app would save this to the server.',
    });
     // In a real app, you'd trigger a server action to update the JSON file.
     console.log("Updated backgrounds array:", [newBackground, ...backgrounds]);
     console.log("To persist this change, you would need a backend endpoint to write this array to 'src/lib/ticket-backgrounds.json'");
  };

  const handleDelete = (id: string) => {
    // This is also a simulation.
    setBackgrounds(prev => prev.filter(bg => bg.id !== id));
    toast({
      title: 'Background Removed (Simulated)',
      description: 'The background has been removed from the local list.',
    });
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
            <label htmlFor="background-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
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
              <Button variant="outline" onClick={() => { setPreview(null); setNewImage(null); }}>Cancel</Button>
              <Button onClick={handleUpload}>Save Background</Button>
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
            {backgrounds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {backgrounds.map(bg => (
                        <div key={bg.id} className="relative group aspect-[2/3]">
                            <Image src={bg.url} alt="Ticket Background" layout="fill" className="object-cover rounded-md" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(bg.id)}>
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
