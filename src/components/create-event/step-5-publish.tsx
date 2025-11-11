'use client';

import { UseFormReturn } from "react-hook-form";
import { EventFormValues } from "@/app/create-event/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, PlusCircle } from "lucide-react";

interface Step5PublishProps {
    form: UseFormReturn<EventFormValues>;
}

export function Step5Publish({ form }: Step5PublishProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold font-headline">Almost there!</h2>
            <p className="text-muted-foreground">Set your ticket price and category before publishing.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="music">Music</SelectItem>
                            <SelectItem value="arts">Arts & Culture</SelectItem>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="food">Food & Drink</SelectItem>
                            <SelectItem value="sports">Sports</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Ticket (USD)</FormLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" placeholder="0.00 for free" className="pl-8 h-12" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="submit" size="lg">Save Draft</Button>
                <Button type="submit" size="lg">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Publish Event
                </Button>
            </div>
        </div>
    );
}
