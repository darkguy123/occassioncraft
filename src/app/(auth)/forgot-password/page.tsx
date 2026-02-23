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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { MailQuestion, Loader2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    }
  });

  const onSubmit = async (data: ForgotPasswordSchema) => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not connect to the authentication service.",
        });
        return;
    }
    try {
      const actionCodeSettings = {
        // Use a reliable origin for the URL.
        url: `${window.location.origin}/update-password`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, data.email, actionCodeSettings);
      toast({
        title: "Request Sent Successfully",
        description: "If an account with this email exists, a password reset link has been sent. Please check your inbox.",
      });
    } catch (error: any) {
      console.error("Forgot Password Error:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send Request",
        description: "There was a problem sending the request. Please ensure the email address is correct and try again.",
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] md:min-h-screen py-12 px-4 bg-secondary/30">
      <Card className="mx-auto max-w-sm w-full shadow-lg md:shadow-none md:border-0 md:bg-transparent">
        <CardHeader className="text-center">
          <MailQuestion className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
          <CardDescription>
            No worries, we'll send you reset instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send Reset Link
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
