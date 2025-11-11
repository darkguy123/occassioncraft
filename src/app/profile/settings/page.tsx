'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateProfile, getAuth, updateEmail } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Upload } from 'lucide-react';
import { ImageCropperDialog } from '@/components/shared/image-cropper-dialog';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAvatarUrl, setCroppedAvatarUrl] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  useEffect(() => {
    if (userData) {
      form.reset({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
      });
    }
  }, [userData, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCrop = (croppedImageUrl: string) => {
    setCroppedAvatarUrl(croppedImageUrl);
    setIsCropperOpen(false);
  };

  const uploadCroppedImage = async (uid: string, dataUrl: string) => {
    const storage = getStorage();
    const storageRef = ref(storage, `users/${uid}/profile.jpg`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return getDownloadURL(storageRef);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !userRef) return;
    
    let photoURL = userData?.profileImageUrl || user.photoURL;

    try {
      if (croppedAvatarUrl) {
        photoURL = await uploadCroppedImage(user.uid, croppedAvatarUrl);
      }
      
      const auth = getAuth();
      if (auth.currentUser) {
          await updateProfile(auth.currentUser, { 
              displayName: `${data.firstName} ${data.lastName}`,
              photoURL: photoURL
          });

          if (data.email !== auth.currentUser.email) {
            // Re-authentication might be needed for this
            await updateEmail(auth.currentUser, data.email);
          }
      }

      updateDocumentNonBlocking(userRef, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        profileImageUrl: photoURL
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  };

  if (isUserLoading || isUserDataLoading) {
    return (
        <div className="container max-w-2xl py-12 px-4 space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                             <Skeleton className="h-10 w-32" />
                             <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                     <Skeleton className="h-14 w-full" />
                     <div className="flex justify-end">
                        <Skeleton className="h-10 w-28" />
                     </div>
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <>
    {imageSrc && (
        <ImageCropperDialog
            isOpen={isCropperOpen}
            onClose={() => setIsCropperOpen(false)}
            imageSrc={imageSrc}
            onCrop={onCrop}
        />
    )}
    <div className="container max-w-2xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold font-headline">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and personal information.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your photo and personal details here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-6">
                     <div className="relative group">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={croppedAvatarUrl || userData?.profileImageUrl || user?.photoURL || ''} />
                            <AvatarFallback>
                                {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Edit className="h-8 w-8" />
                        </label>
                    </div>
                    <div>
                        <Label htmlFor="avatar-upload" className="cursor-pointer">
                             <Button asChild variant="outline">
                                <div>
                                    <Upload className="mr-2 h-4 w-4"/>
                                    Upload new picture
                                </div>
                            </Button>
                        </Label>
                        <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <p className="text-xs text-muted-foreground mt-2">Recommended: a square 400x400px image.</p>
                    </div>
                </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <div className="flex justify-end">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

    