
'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useFirestore, setDocumentNonBlocking, useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PartyPopper, AlertTriangle, UserPlus, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

// Simplified schema, everyone is a vendor
export const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  companyName: z.string().min(3, { message: "Company name must be at least 3 characters." }),
  companyDescription: z.string().optional(),
});

export type SignupSchema = z.infer<typeof signupSchema>;

const DEFAULT_LOGO_URL = '/recommenoptimized.svg';

export default function SignupPage() {
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const { siteSettings, isSiteSettingsLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      companyName: "",
      companyDescription: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: SignupSchema) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        // Sign in the user automatically
        await signInWithEmailAndPassword(auth, data.email, data.password);
        
        await updateProfile(user, {
            displayName: data.fullName,
        });

        const [firstName, ...lastName] = data.fullName.split(' ');
        
        const finalRoles = ['user', 'vendor'];
        // Special admin case
        if (data.email.toLowerCase() === 'valentinoboss18@gmail.com') {
            finalRoles.push('admin');
        }
        
        const userRef = doc(firestore, "users", user.uid);
        const userData: any = {
          id: user.uid,
          firstName: firstName,
          lastName: lastName.join(' '),
          email: data.email,
          roles: Array.from(new Set(finalRoles)),
          dateJoined: new Date().toISOString(),
        };

        setDocumentNonBlocking(userRef, userData, { merge: true });

        if (finalRoles.includes('admin')) {
            const adminRoleRef = doc(firestore, "roles_admin", user.uid);
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        }
        
        // Create vendor document for every user
        const vendorRef = doc(firestore, 'vendors', user.uid);
        setDocumentNonBlocking(vendorRef, {
            id: user.uid,
            userId: user.uid,
            companyName: data.companyName,
            description: data.companyDescription,
            contactEmail: user.email,
            status: 'approved', // AUTOMATICALLY APPROVE VENDORS
            createdAt: new Date().toISOString(),
            pricingTier: 'Free',
        }, { merge: true });
        
        setShowWelcomeDialog(true);
      }
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setShowEmailExistsDialog(true);
        } else {
            toast({
                variant: "destructive",
                title: "Sign-up Failed",
                description: error.message,
            });
        }
    }
  };
  
  const logoUrl = siteSettings?.logoUrl || DEFAULT_LOGO_URL;

  return (
    <>
      <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-2">
         <div className="hidden md:block relative bg-[#1e40af] p-8 text-white">
            <div className="relative z-10 flex flex-col h-full">
                <Link href="/" className="mb-auto">
                    {isSiteSettingsLoading ? (
                        <div className="h-10 w-36 bg-gray-200/50 rounded-md animate-pulse" />
                    ) : (
                        <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={40} className="h-10 w-auto" unoptimized/>
                    )}
                </Link>
                <div className="my-auto">
                  <h1 className="text-4xl font-bold font-headline">Create Your Account</h1>
                  <p className="text-white/80 mt-2 max-w-sm">Join the ultimate platform for event creation and discovery. All users are vendors by default.</p>
                </div>
            </div>
      </div>
      
      <div className="flex items-center justify-center p-4 sm:p-8 bg-secondary/30">
        <Card className="mx-auto max-w-sm w-full shadow-2xl md:shadow-none md:border-0 md:bg-transparent">
          <CardHeader>
               <CardTitle className="text-center pt-8 md:pt-0">
                    <UserPlus className="mx-auto h-8 w-8 text-primary" />
               </CardTitle>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <h2 className="text-2xl font-bold text-center">Create Your Account</h2>
                  <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Full name</FormLabel>
                              <FormControl>
                                  <Input placeholder="Max Robinson" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                  <Input type="email" placeholder="m@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Password</FormLabel>
                               <div className="relative">
                                  <FormControl>
                                      <Input type={showPassword ? "text" : "password"} {...field} />
                                  </FormControl>
                                   <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                                      >
                                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                              </div>
                               <FormMessage />
                          </FormItem>
                      )}
                  />
                   <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. EventMakers Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                  />
                 <FormField
                    control={form.control}
                    name="companyDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="What does your company do?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating Account...' : 'Sign Up'}
                </Button>
                </form>
              </Form>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="underline">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      <AlertDialog open={showWelcomeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-center">
             <PartyPopper className="mx-auto h-12 w-12 text-primary" />
            <AlertDialogTitle className="text-2xl">Welcome Aboard!</AlertDialogTitle>
            <AlertDialogDescription>
              Your account has been created successfully. You're now being redirected to your vendor dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <AlertDialogAction onClick={() => router.push('/vendor/dashboard')} className="w-full">
              Go to my Dashboard
            </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEmailExistsDialog} onOpenChange={setShowEmailExistsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500" /> Account Exists
            </AlertDialogTitle>
            <AlertDialogDescription>
              An account with the email address <span className="font-semibold text-foreground">{form.getValues("email")}</span> already exists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-4">
             <AlertDialogAction asChild>
                <Link href="/login">Login</Link>
            </AlertDialogAction>
            <AlertDialogAction asChild variant="secondary">
                <Link href="/forgot-password">Forgot Password?</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
