
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getAuth, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Upload, Loader2 } from 'lucide-react';
import { ImageCropperDialog } from '@/components/shared/image-cropper-dialog';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Label } from '@/components/ui/label';
import { ChangeEmailDialog } from '@/components/profile/change-email-dialog';

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email(),
  profileImageUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      profileImageUrl: '',
    },
  });

  useEffect(() => {
    if (userData) {
      form.reset({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        profileImageUrl: userData.profileImageUrl,
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

  const onCrop = async (croppedImageBase64: string) => {
    setIsCropperOpen(false);
    if (!user || !storage) return;

    const blob = await fetch(croppedImageBase64).then(res => res.blob());

    setIsAvatarUploading(true);
    const storageRef = ref(storage, `public-uploads/avatars/${user.uid}/profile.png`);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on('state_changed',
        (snapshot) => {},
        (error) => {
            console.error("Error uploading avatar:", error);
            toast({ variant: 'destructive', title: 'Avatar Upload Failed', description: 'Could not save your new picture.' });
            setIsAvatarUploading(false);
        },
        async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                form.setValue('profileImageUrl', downloadURL);
                toast({ title: 'Avatar Updated', description: 'Click "Save Changes" to apply your new picture.' });
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Avatar Upload Failed', description: 'Could not get image URL.' });
            } finally {
                setIsAvatarUploading(false);
            }
        }
    );
  };
  
  const handleEmailChangeRequest = async (newEmail: string) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser || !firestore) return;
      
      try {
          await verifyBeforeUpdateEmail(currentUser, newEmail);
          
          const userDocRef = doc(firestore, 'users', currentUser.uid);
          updateDocumentNonBlocking(userDocRef, { email: newEmail });

          toast({
              title: "Verification Email Sent",
              description: `A verification link has been sent to ${newEmail}. Please check your inbox to complete the change.`,
          });
          setIsEmailDialogOpen(false);
          form.setValue('email', newEmail);
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Error Sending Verification",
              description: error.message,
          });
      }
  }


  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !userRef) return;
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      let displayName = `${data.firstName} ${data.lastName}`;
      let photoURL = data.profileImageUrl || currentUser?.photoURL;
      
      if (currentUser && (currentUser.displayName !== displayName || currentUser.photoURL !== photoURL)) {
          await updateProfile(currentUser, { displayName, photoURL });
      }

      updateDocumentNonBlocking(userRef, {
        firstName: data.firstName,
        lastName: data.lastName,
        profileImageUrl: data.profileImageUrl,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

    } catch (error: any) {
      console.error(error);
      let description = error.message;
      if (error.code === 'auth/requires-recent-login') {
        description = 'Changing your email requires a recent login. Please log out and log back in to update your email.'
      }
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: description,
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
    
    <ChangeEmailDialog
        isOpen={isEmailDialogOpen}
        onClose={() => setIsEmailDialogOpen(false)}
        currentEmail={userData?.email}
        onConfirm={handleEmailChangeRequest}
    />

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
                            <AvatarImage src={form.watch('profileImageUrl') || user?.photoURL || ''} />
                            <AvatarFallback>
                                {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            {isAvatarUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Edit className="h-8 w-8" />}
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
                        <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isAvatarUploading}/>
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
                      <FormControl><Input type="email" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex justify-start -mt-2">
                    <Button type="button" variant="link" className="p-0 h-auto" onClick={() => setIsEmailDialogOpen(true)}>
                        Change Email
                    </Button>
                </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isAvatarUploading || form.formState.isSubmitting}>
                    {isAvatarUploading || form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
