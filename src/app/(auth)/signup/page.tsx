
'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, PartyPopper, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Step1AccountDetails } from "@/components/signup/step-1-account-details";
import { Step2UserType } from "@/components/signup/step-2-user-type";
import { Step3VendorInfo } from "@/components/signup/step-3-vendor-info";
import { Step4Avatar } from "@/components/signup/step-4-avatar";
import { Step5Terms } from "@/components/signup/step-5-terms";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  roles: z.array(z.string()).min(1, { message: "Please select at least one role." }),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  avatarUrl: z.string().optional(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions." }),
  }),
}).refine(data => {
    if (data.roles.includes('vendor')) {
        return !!data.companyName && data.companyName.length >= 2;
    }
    return true;
}, {
    message: "Company name must be at least 2 characters.",
    path: ['companyName']
});

export type SignupSchema = z.infer<typeof signupSchema>;

const getStoredSignupData = () => {
    if (typeof window === 'undefined') return {};
    const savedData = localStorage.getItem('signupFormData');
    try {
        return savedData ? JSON.parse(savedData) : {};
    } catch (e) {
        return {};
    }
};

const getStoredSignupStep = () => {
    if (typeof window === 'undefined') return 0;
    const savedStep = localStorage.getItem('signupFormStep');
    return savedStep ? parseInt(savedStep, 10) : 0;
};


export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
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
      roles: ["user"],
      companyName: "",
      companyDescription: "",
      avatarUrl: "",
      terms: false,
    },
    mode: "onChange",
  });
  
  useEffect(() => {
    const savedData = getStoredSignupData();
    const savedStep = getStoredSignupStep();

    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
    if (savedStep) {
        setCurrentStep(savedStep);
    }
  }, [form]);

  const watchedValues = form.watch();

  useEffect(() => {
    localStorage.setItem('signupFormData', JSON.stringify(watchedValues));
    localStorage.setItem('signupFormStep', String(currentStep));
  }, [watchedValues, currentStep]);

  const steps = [
    { id: 1, component: Step1AccountDetails, fields: ['fullName', 'email', 'password'] },
    { id: 2, component: Step2UserType, fields: ['roles'] },
    ...(form.watch('roles').includes('vendor') ? [{ id: 3, component: Step3VendorInfo, fields: ['companyName'] }] : []),
    { id: 4, component: Step4Avatar, fields: [] },
    { id: 5, component: Step5Terms, fields: ['terms'] },
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isValid = await form.trigger(fieldsToValidate as (keyof SignupSchema)[]);
    
    if (isValid && currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStartOver = () => {
    localStorage.removeItem('signupFormData');
    localStorage.removeItem('signupFormStep');
    form.reset({
      fullName: "", email: "", password: "", roles: ["user"],
      companyName: "", companyDescription: "", avatarUrl: "", terms: false,
    });
    setCurrentStep(0);
    toast({ title: "Form Cleared", description: "You can now start your registration over." });
  };

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
        
        const roles = data.roles.length > 0 ? data.roles : ['user'];
        
        if (data.email.toLowerCase() === 'valentinoboss18@gmail.com') {
            if (!roles.includes('admin')) {
                roles.push('admin');
            }
        }
        
        const userRef = doc(firestore, "users", user.uid);
        const userData = {
          id: user.uid,
          firstName: firstName,
          lastName: lastName.join(' '),
          email: data.email,
          roles: Array.from(new Set(roles)), 
          profileImageUrl: data.avatarUrl || '',
          dateJoined: new Date().toISOString(),
        };
        setDocumentNonBlocking(userRef, userData, { merge: true });

        if (roles.includes('admin')) {
            const adminRoleRef = doc(firestore, "roles_admin", user.uid);
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        }

        if (data.roles.includes('vendor')) {
          const vendorRef = doc(firestore, "vendors", user.uid);
          const vendorData = {
            id: user.uid,
            userId: user.uid,
            companyName: data.companyName,
            description: data.companyDescription,
            contactEmail: data.email,
            status: 'pending',
          };
          setDocumentNonBlocking(vendorRef, vendorData, { merge: true });
        }

        setShowWelcomeDialog(true);
      }
      
      localStorage.removeItem('signupFormData');
      localStorage.removeItem('signupFormStep');

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

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep].component;

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
        <Card className="mx-auto max-w-md w-full">
          <CardHeader className="text-center">
              <Ticket className="mx-auto h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
              <CardDescription>Join our platform in just a few steps.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    {currentStep > 0 ? (
                        <Button variant="ghost" onClick={handlePrev} className="text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    ) : <div />}
                    <Button variant="destructive" size="sm" onClick={handleStartOver}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Start Over
                    </Button>
                  </div>
                  <Progress value={progress} className="h-2 animated-progress" />
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-hidden relative h-96">
                  <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                      className="absolute w-full"
                    >
                      <CurrentStepComponent form={form} onNext={handleNext} />
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
              An account with the email address <span className="font-semibold">{form.getValues("email")}</span> already exists.
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

    