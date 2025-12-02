
'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Ticket, PartyPopper, AlertTriangle } from "lucide-react";
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

const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions." }),
  }),
});

export type SignupSchema = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
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

  return (
    <>
      <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4.5rem)] py-12 px-4">
        <Image
          src='https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2F67e206b7d52d22580e4ec0d8_890.jpg?alt=media&token=c0a35579-2cdf-4d20-9aa9-6163ff95eddf'
          alt="Hero Banner"
          fill
          className="object-cover -z-10"
          data-ai-hint='concert stage lights'
        />
        <div className="absolute inset-0 bg-black/70 -z-10" />

        <Card className="mx-auto max-w-sm w-full">
          <CardHeader className="text-center">
              <Ticket className="mx-auto h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
              <CardDescription>Join our platform to discover and attend events.</CardDescription>
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
