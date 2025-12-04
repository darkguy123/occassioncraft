
'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useFirestore, setDocumentNonBlocking, useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Ticket, PartyPopper, AlertTriangle, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";

const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions." }),
  }),
});

export type SignupSchema = z.infer<typeof signupSchema>;

const DEFAULT_LOGO_URL = '/recommenoptimized.svg';
const features = [
  "Design custom tickets",
  "Manage event sales",
  "Discover new experiences",
  "Scan tickets seamlessly",
  "Engage with your audience",
];

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

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
      terms: false,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (data: SignupSchema) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        await sendEmailVerification(user);

        await updateProfile(user, {
            displayName: data.fullName,
        });

        const [firstName, ...lastName] = data.fullName.split(' ');
        
        const roles = ['user'];
        // Assign admin role if the email matches
        if (data.email.toLowerCase() === 'valentinoboss18@gmail.com') {
            roles.push('admin');
        }
        
        const userRef = doc(firestore, "users", user.uid);
        const userData = {
          id: user.uid,
          firstName: firstName,
          lastName: lastName.join(' '),
          email: data.email,
          roles: roles,
          dateJoined: new Date().toISOString(),
        };
        setDocumentNonBlocking(userRef, userData, { merge: true });

        if (roles.includes('admin')) {
            const adminRoleRef = doc(firestore, "roles_admin", user.uid);
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        }
        
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
      <div className="w-full min-h-[calc(100vh-4rem)] md:min-h-screen grid grid-cols-1 md:grid-cols-2">
         <div className="hidden md:block relative">
            <Image
            src="https://picsum.photos/seed/signup-bg/1200/1600"
            alt="Signup background"
            data-ai-hint="event excitement fun"
            fill
            className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-black/60 to-black/80" />
            <div className="relative z-10 flex flex-col justify-between h-full p-8 text-white">
                <div>
                    {isSiteSettingsLoading ? (
                        <div className="h-10 w-36 bg-gray-200/50 rounded-md animate-pulse" />
                    ) : (
                        <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={40} className="h-10 w-auto" unoptimized/>
                    )}
                    <h1 className="text-4xl font-bold font-headline mt-8">Create Your Account</h1>
                    <p className="text-white/80 mt-2">Join the ultimate platform for event creation and discovery.</p>
                </div>
                
                <div className="h-20">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentFeatureIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center gap-3 text-lg font-medium"
                        >
                            <Ticket className="h-6 w-6 text-accent" />
                            <span>{features[currentFeatureIndex]}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
      </div>
      
      <div className="flex items-center justify-center p-4 sm:p-8 bg-secondary/30">
        <Card className="mx-auto max-w-sm w-full shadow-2xl md:shadow-none md:border-0 md:bg-transparent">
          <CardHeader className="text-center">
              <UserPlus className="mx-auto h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-headline">Get Started</CardTitle>
              <CardDescription>Enter your details to create your account.</CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        name="terms"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                    Accept{" "}
                                    <Link href="/terms" target="_blank" className="underline">terms and conditions</Link>
                                    </FormLabel>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        Create Account
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
              Your account has been created. We've sent a verification link to your email address. Please check your inbox!
            </AlertDialogDescription>
          </AlertDialogHeader>
            <AlertDialogAction onClick={() => router.push('/')} className="w-full">
              Continue
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
