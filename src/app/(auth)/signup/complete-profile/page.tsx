
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
import { UserCheck, Loader2, User, Building, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
            status: 'pending', // Vendor application starts as pending
            createdAt: new Date().toISOString(),
            pricingTier: 'Free',
        }, { merge: true });
        router.push('/dashboard');
        toast({
            title: "Application Submitted!",
            description: "Your vendor application is now pending review. You will be notified of any status changes."
        });
      } else {
        router.push('/dashboard');
        toast({
            title: "Welcome!",
            description: "Your profile has been created.",
        });
      }
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
                        className="grid grid-cols-2 gap-4"
                      >
                        <FormItem>
                          <RadioGroupItem value="user" id="user" className="sr-only peer" />
                          <FormLabel
                            htmlFor="user"
                            className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:shadow-md relative cursor-pointer"
                          >
                             <div className="absolute top-2 right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white peer-data-[state=checked]:flex">
                                <Check className="h-3 w-3" />
                            </div>
                            <User className="mb-3 h-8 w-8" />
                            <span className="font-semibold text-center">Discover Events</span>
                            <span className="text-xs text-muted-foreground font-normal mt-1 text-center">As a Normal User</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem>
                          <RadioGroupItem value="vendor" id="vendor" className="sr-only peer" />
                          <FormLabel
                            htmlFor="vendor"
                            className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:shadow-md relative cursor-pointer"
                          >
                            <div className="absolute top-2 right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white peer-data-[state=checked]:flex">
                                <Check className="h-3 w-3" />
                            </div>
                            <Building className="mb-3 h-8 w-8" />
                            <span className="font-semibold text-center">Create Events</span>
                            <span className="text-xs text-muted-foreground font-normal mt-1 text-center">As a Vendor</span>
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
