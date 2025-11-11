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
import { Ticket } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth, useFirestore } from "@/firebase";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


const signupSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions." }),
  }),
});

type SignupSchema = z.infer<typeof signupSchema>;


export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit: SubmitHandler<SignupSchema> = async (data) => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(data.email, data.password);
      const user = userCredential.user;
      
      const [firstName, ...lastName] = data.fullName.split(' ');

      if (user) {
        const userRef = doc(firestore, "users", user.uid);
        const userData = {
          id: user.uid,
          firstName: firstName,
          lastName: lastName.join(' '),
          email: data.email,
          userType: 'User', // Default to 'User'
          dateJoined: new Date().toISOString(),
        };
        setDocumentNonBlocking(userRef, userData, { merge: true });
      }

      toast({
        title: "Account Created",
        description: "You have successfully signed up.",
      });
      router.push('/dashboard');

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: error.message,
      });
    }
  };


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <Ticket className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" placeholder="Max Robinson" {...register("fullName")} />
                {errors.fullName && <p className="text-destructive text-xs">{errors.fullName.message}</p>}
            </div>
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
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" {...register("terms")} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="terms" className="text-sm font-normal">
                  I agree to the{" "}
                  <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                  </Link>
                </Label>
                 {errors.terms && <p className="text-destructive text-xs">{errors.terms.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full">
              Create an account
            </Button>
            <Button variant="outline" className="w-full" type="button">
              Sign up with Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

    