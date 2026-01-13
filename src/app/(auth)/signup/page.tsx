
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
import { PartyPopper, AlertTriangle, UserPlus, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
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
import { AnimatePresence, motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Step1AccountDetails } from "@/components/signup/step-1-account-details";
import { Step2UserType } from "@/components/signup/step-2-user-type";
import { Step3VendorInfo } from "@/components/signup/step-3-vendor-info";
import { Step4Avatar } from "@/components/signup/step-4-avatar";
import { Step5Terms } from "@/components/signup/step-5-terms";

export const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  roles: z.array(z.string()).min(1, "Please select at least one role."),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  avatarUrl: z.string().optional(),
  terms: z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (data.roles.includes('vendor') && !data.companyName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Company name is required for vendors.",
            path: ['companyName'],
        });
    }
});

export type SignupSchema = z.infer<typeof signupSchema>;

const DEFAULT_LOGO_URL = '/recommenoptimized.svg';
const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2F62eb2c32479e4d5885188f5a_user-icon-trendy-flat-style-isolated-grey-background-user-symbol-user-icon-trendy-flat-style-isolated-grey-background-123241802-removebg-preview.png?alt=media&token=4ddc16d5-a339-445e-85a4-9273f5509930';

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  
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
      roles: ['user'],
      avatarUrl: DEFAULT_AVATAR_URL,
      terms: false,
    },
    mode: "onChange",
  });

  const isVendorFlow = form.watch('roles')?.includes('vendor');
  const totalSteps = isVendorFlow ? 5 : 4;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const onSubmit = async (data: SignupSchema) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        
        await updateProfile(user, {
            displayName: data.fullName,
            photoURL: data.avatarUrl,
        });

        const [firstName, ...lastName] = data.fullName.split(' ');
        
        const finalRoles = [...data.roles];
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

        if (data.avatarUrl) {
          userData.profileImageUrl = data.avatarUrl;
        }

        setDocumentNonBlocking(userRef, userData, { merge: true });

        if (finalRoles.includes('admin')) {
            const adminRoleRef = doc(firestore, "roles_admin", user.uid);
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        }
        
        if (data.roles.includes('vendor')) {
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
  
  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);
  
  const logoUrl = siteSettings?.logoUrl || DEFAULT_LOGO_URL;

  const renderStep = () => {
      switch(currentStep) {
          case 0: return <Step1AccountDetails form={form} onNext={handleNext} />;
          case 1: return <Step2UserType form={form} onNext={handleNext} />;
          case 2: return isVendorFlow ? <Step3VendorInfo form={form} onNext={handleNext} /> : <Step4Avatar form={form} onNext={handleNext} />;
          case 3: return isVendorFlow ? <Step4Avatar form={form} onNext={handleNext} /> : <Step5Terms form={form} />;
          case 4: return <Step5Terms form={form} />;
          default: return null;
      }
  }

  return (
    <>
      <div className="w-full min-h-[calc(100vh-4rem)] md:min-h-screen grid grid-cols-1 md:grid-cols-2">
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
                  <p className="text-white/80 mt-2 max-w-sm">Join the ultimate platform for event creation and discovery.</p>
                </div>
                <div className="mt-auto">
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-xs text-white/70 mt-2">Step {currentStep + 1} of {totalSteps}</p>
                </div>
            </div>
      </div>
      
      <div className="flex items-center justify-center p-4 sm:p-8 bg-secondary/30">
        <Card className="mx-auto max-w-sm w-full shadow-2xl md:shadow-none md:border-0 md:bg-transparent">
          <CardHeader>
              {currentStep > 0 && (
                <Button variant="ghost" onClick={handleBack} className="absolute top-6 left-4 sm:top-8 sm:left-8">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
               <CardTitle className="text-center pt-8 md:pt-0">
                    <UserPlus className="mx-auto h-8 w-8 text-primary" />
               </CardTitle>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <AnimatePresence mode="wait">
                       <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                       >
                         {renderStep()}
                       </motion.div>
                    </AnimatePresence>
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
              Your account has been created successfully. You're now being redirected to your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <AlertDialogAction onClick={() => router.push(isVendorFlow ? '/vendor/dashboard' : '/dashboard')} className="w-full">
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
