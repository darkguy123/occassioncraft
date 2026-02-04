
'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

const completeProfileSchema = z.object({
  accountType: z.enum(["user", "vendor"], { required_error: "Please select an account type." }),
});

type CompleteProfileSchema = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CompleteProfileSchema>({
    resolver: zodResolver(completeProfileSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: CompleteProfileSchema) => {
    if (!user || !firestore) return;
    
    try {
      const userRef = doc(firestore, "users", user.uid);
      const [firstName, ...lastName] = user.displayName?.split(' ') || ['', ''];

      const finalRoles = ['user'];
      if (data.accountType === 'vendor') {
        finalRoles.push('vendor');
      }

      const userData: any = {
        id: user.uid,
        firstName: firstName,
        lastName: lastName.join(' '),
        email: user.email,
        roles: Array.from(new Set(finalRoles)),
        dateJoined: new Date().toISOString(),
        profileImageUrl: user.photoURL,
      };

      setDocumentNonBlocking(userRef, userData, { merge: true });

      if (data.accountType === 'vendor') {
        const vendorRef = doc(firestore, 'vendors', user.uid);
        setDocumentNonBlocking(vendorRef, {
            id: user.uid,
            userId: user.uid,
            companyName: `${user.displayName}'s Company`,
            description: 'Ready to host amazing events!',
            contactEmail: user.email,
            status: 'approved',
            createdAt: new Date().toISOString(),
            pricingTier: 'Free',
        }, { merge: true });
        router.push('/vendor/dashboard');
      } else {
        router.push('/dashboard');
      }

      toast({
        title: "Welcome!",
        description: "Your profile has been created.",
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message,
      });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user && !isUserLoading) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 bg-secondary/30">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="text-center">
          <UserCheck className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-headline">One Last Step</CardTitle>
          <CardDescription>
            Welcome, {user?.displayName}! How would you like to use OccasionCraft?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="user" id="user" className="sr-only" />
                          </FormControl>
                          <FormLabel
                            htmlFor="user"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            Discover Events
                            <span className="text-xs text-muted-foreground font-normal mt-1">As a Normal User</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="vendor" id="vendor" className="sr-only" />
                          </FormControl>
                          <FormLabel
                            htmlFor="vendor"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            Create Events
                            <span className="text-xs text-muted-foreground font-normal mt-1">As a Vendor</span>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Finalizing...' : 'Complete Profile'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
