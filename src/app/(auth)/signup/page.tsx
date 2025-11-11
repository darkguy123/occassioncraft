
'use client';

import { useState } from "react";
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
import { ArrowLeft, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Step1AccountDetails } from "@/components/signup/step-1-account-details";
import { Step2UserType } from "@/components/signup/step-2-user-type";
import { Step3VendorInfo } from "@/components/signup/step-3-vendor-info";
import { Step4Avatar } from "@/components/signup/step-4-avatar";
import { Step5Terms } from "@/components/signup/step-5-terms";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

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

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  
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
      setCurrentStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: SignupSchema) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        await updateProfile(user, {
            displayName: data.fullName,
            photoURL: data.avatarUrl,
        });

        const [firstName, ...lastName] = data.fullName.split(' ');
        
        const roles = data.roles.length > 0 ? data.roles : ['user'];
        
        // Admin Seeder Logic: Assign 'admin' role if the email matches.
        if (data.email.toLowerCase() === 'valentinoboss18@gmail.com') {
            if (!roles.includes('admin')) {
                roles.push('admin');
            }
        }
        
        // Create User document
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

        // If the user is an admin, create an entry in the roles_admin collection
        if (roles.includes('admin')) {
            const adminRoleRef = doc(firestore, "roles_admin", user.uid);
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        }


        // If Vendor, create a separate vendor document
        if (data.roles.includes('vendor')) {
          const vendorRef = doc(firestore, "vendors", user.uid);
          const vendorData = {
            id: user.uid,
            userId: user.uid,
            companyName: data.companyName,
            description: data.companyDescription,
            contactEmail: data.email,
            status: 'approved', // Defaulting to approved for simplicity
          };
          setDocumentNonBlocking(vendorRef, vendorData, { merge: true });
        }
      }

      toast({
        title: "Account Created",
        description: "You have successfully signed up.",
      });
      
      const finalRoles = Array.from(new Set(data.roles));
      if (finalRoles.includes('admin')) {
          router.push('/admin');
      } else if (finalRoles.includes('vendor')) {
          router.push('/vendor/dashboard');
      } else {
          router.push('/dashboard');
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: error.message,
      });
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
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
            <Ticket className="mx-auto h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
            <CardDescription>Join our platform in just a few steps.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4 mb-8">
                {currentStep > 0 && (
                    <Button variant="ghost" onClick={handlePrev} className="text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                )}
                <Progress value={progress} className="h-2" />
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
  );
}
