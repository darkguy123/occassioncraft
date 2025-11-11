'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, notFound } from 'next/navigation';
import { useEffect } from "react";
import { Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Vendor } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const vendorFormSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").optional(),
  contactEmail: z.string().email("Invalid email address."),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

export default function EditVendorPage({ params }: { params: { vendorId: string } }) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const vendorRef = useMemoFirebase(() => {
    if (!firestore || !params.vendorId) return null;
    return doc(firestore, 'vendors', params.vendorId);
  }, [firestore, params.vendorId]);

  const { data: vendor, isLoading, error } = useDoc<Vendor>(vendorRef);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      companyName: "",
      description: "",
      contactEmail: "",
    }
  });

  useEffect(() => {
    if (vendor) {
      form.reset({
        companyName: vendor.companyName,
        description: vendor.description,
        contactEmail: vendor.contactEmail,
      });
    }
  }, [vendor, form]);
  
  if (error) {
    notFound();
  }

  const onSubmit = (data: VendorFormValues) => {
    if (!vendorRef) return;
    
    updateDocumentNonBlocking(vendorRef, data);
    
    toast({
      title: "Vendor Updated",
      description: `"${data.companyName}" has been successfully updated.`,
    });
    router.push('/admin/vendors');
  };

  if (isLoading || !vendor) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Vendor</h1>
        <p className="text-muted-foreground">Modify the details for &quot;{vendor?.companyName}&quot;.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
          <CardDescription>Make changes to the vendor's profile below and save.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-32" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
