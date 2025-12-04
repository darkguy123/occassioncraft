
'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Ticket, LogIn } from "lucide-react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth, useFirebase } from "@/firebase";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().default(false),
});

type LoginSchema = z.infer<typeof loginSchema>;

const DEFAULT_LOGO_URL = '/default-logo.png';
const features = [
  "Design custom tickets",
  "Manage event sales",
  "Discover new experiences",
  "Scan tickets seamlessly",
  "Engage with your audience",
];


export default function LoginPage() {
  const auth = useAuth();
  const { siteSettings, isSiteSettingsLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: true,
    }
  });

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    if (!auth) return;
    try {
      const persistence = data.rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      
      initiateEmailSignIn(auth, data.email, data.password);
      
      toast({
        title: "Login Successful",
        description: "You are now logged in.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    }
  };
  
  const logoUrl = siteSettings?.logoUrl || DEFAULT_LOGO_URL;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] md:min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:block relative bg-[#1e40af]">
        <div className="relative z-10 flex flex-col justify-between h-full p-8 text-white">
            <div>
                 {isSiteSettingsLoading ? (
                    <div className="h-10 w-36 bg-gray-200/50 rounded-md animate-pulse" />
                ) : (
                    <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={40} className="h-10 w-auto" unoptimized/>
                )}
                 <h1 className="text-4xl font-bold font-headline mt-8">Welcome Back</h1>
                <p className="text-white/80 mt-2">Sign in to continue your journey with OccasionCraft.</p>
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
        <Card className="mx-auto max-w-sm w-full shadow-2xl overflow-hidden md:shadow-none md:border-0 md:bg-transparent">
             <CardHeader className="text-center bg-[#3366ff] text-primary-foreground p-6 md:bg-transparent md:text-inherit md:p-0">
                 <div className="mx-auto h-12 w-auto mb-2 md:hidden">
                     <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={40} className="h-10 w-auto" unoptimized/>
                 </div>
                 <div className="hidden md:flex justify-center mb-4">
                    <LogIn className="h-8 w-8 text-primary" />
                 </div>
              <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
              <CardDescription className="text-white/80 md:text-muted-foreground">
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
          <CardContent className="p-6 md:p-0 md:pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} {...register("password")} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                 {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
              </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                      <Checkbox id="remember-me" {...register("rememberMe")} />
                      <Label htmlFor="remember-me" className="text-sm font-normal">Remember me</Label>
                  </div>
                  <Link href="/forgot-password" className="inline-block text-sm underline">
                    Forgot your password?
                  </Link>
                </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
              <Button variant="outline" className="w-full" type="button">
                Login with Google
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
