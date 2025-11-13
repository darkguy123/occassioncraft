
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
import { Ticket, Eye, EyeOff } from "lucide-react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/firebase";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().default(false),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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


  return (
    <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4.5rem)] py-12 px-4">
       <Image
          src='https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2F67e206b7d52d22580e4ec0d8_890.jpg?alt=media&token=c0a35579-2cdf-4d20-9aa9-6163ff95eddf'
          alt="Hero Banner"
          fill
          className="object-cover -z-10"
          data-ai-hint='concert stage lights'
        />
        <div className="absolute inset-0 bg-black/70 -z-10" />

      <Card className="mx-auto max-w-sm w-full text-white border-white/20">
        <CardHeader className="text-center">
            <Ticket className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
          <CardDescription className="text-white/80">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
                className="bg-white/10 border-white/20 placeholder:text-white/50"
              />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
               <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} {...register("password")} className="bg-white/10 border-white/20 placeholder:text-white/50" />
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
  )
}
