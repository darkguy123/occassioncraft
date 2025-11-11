'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter, notFound, useParams } from 'next/navigation';
import { useEffect } from "react";
import { Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function EditUserPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: user, isLoading, error } = useDoc<User>(userRef);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    }
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, form]);

  if (error) {
    notFound();
  }

  const onSubmit = (data: UserFormValues) => {
    if (!userRef) return;
    
    updateDocumentNonBlocking(userRef, data);
    
    toast({
      title: "User Updated",
      description: `Profile for ${data.firstName} ${data.lastName} has been successfully updated.`,
    });
    router.push('/admin/users');
  };
  
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const fallback = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '');

  if (isLoading || !user) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                       <Skeleton className="h-16 w-16 rounded-full" />
                       <Skeleton className="h-10 w-48" />
                    </div>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
        <p className="text-muted-foreground">Modify the details for &quot;{fullName}&quot;.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Make changes to the user's profile below and save.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={user.profileImageUrl} alt={fullName}/>
                    <AvatarFallback>{fallback || 'U'}</AvatarFallback>
                </Avatar>
                <div className="font-medium text-xl">{fullName}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
