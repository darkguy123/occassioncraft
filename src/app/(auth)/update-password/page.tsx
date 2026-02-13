'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { KeyRound, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const updatePasswordSchema = z
  .object({
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

function UpdatePasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!oobCode || !auth) {
      setError('Invalid or missing password reset code. Please request a new link.');
      setIsLoading(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Password reset code verification error:', error);
        setError('The password reset link is invalid or has expired. Please try again.');
        setIsLoading(false);
      });
  }, [oobCode, auth]);

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: UpdatePasswordFormValues) => {
    if (!oobCode || !auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid state. Please try again.' });
      return;
    }
    
    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      setSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully reset. You can now log in.',
      });
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      console.error('Password reset confirmation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset password. The link may have expired.',
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying link...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
          <p className="font-semibold text-destructive">{error}</p>
          <Button asChild variant="link" className="mt-4">
            <Link href="/forgot-password">Request a new reset link</Link>
          </Button>
        </div>
      );
    }
    if (success) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mb-4" />
          <p className="font-semibold">Password Reset Successfully!</p>
          <p className="text-muted-foreground mt-2">You will be redirected to the login page shortly.</p>
        </div>
      );
    }

    return (
      <>
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-headline">Reset Your Password</CardTitle>
          <CardDescription>Enter a new password for {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Update Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 bg-secondary/30">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        {renderContent()}
      </Card>
    </div>
  );
}

export default function UpdatePasswordPage() {
    return (
        <Suspense>
            <UpdatePasswordComponent />
        </Suspense>
    );
}
