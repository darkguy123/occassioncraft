'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { EventPreview } from "@/components/event-preview"
import { TicketStylePreview } from "@/components/ticket-style-preview"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Step1Name } from "@/components/create-event/step-1-name";
import { Step2DateTime } from "@/components/create-event/step-2-datetime";
import { Step3Location } from "@/components/create-event/step-3-location";
import { Step4Details } from "@/components/create-event/step-4-details";
import { Step5Publish } from "@/components/create-event/step-5-publish";
import { Progress } from "@/components/ui/progress"
import { ArrowLeft } from "lucide-react"

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters.").max(100, "Event name must be less than 100 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(2000, "Description must be less than 2000 characters."),
  date: z.date({ required_error: "A date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
  location: z.string().min(3, "Location is required."),
  category: z.string({ required_error: "Please select a category." }),
  ticketPrice: z.coerce.number().min(0, "Price must be a positive number."),
  bannerUrl: z.string().optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

const steps = [
  { id: 1, component: Step1Name },
  { id: 2, component: Step2DateTime },
  { id: 3, component: Step3Location },
  { id: 4, component: Step4Details },
  { id: 5, component: Step5Publish },
];

export default function CreateEventPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema.pick(
      currentStep === 0 ? { name: true } :
      currentStep === 1 ? { date: true, startTime: true } :
      currentStep === 2 ? { location: true } :
      { description: true, bannerUrl: true, category: true, ticketPrice: true }
    )),
    defaultValues: {
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      ticketPrice: 0,
      category: 'other',
      date: undefined,
      bannerUrl: '',
    },
    mode: "onChange"
  });
  
  const watchedValues = form.watch();
  
  const handleNext = async () => {
    const fieldsToValidate: (keyof EventFormValues)[] = 
      currentStep === 0 ? ['name'] :
      currentStep === 1 ? ['date', 'startTime'] :
      currentStep === 2 ? ['location'] :
      [];

    const isValid = await form.trigger(fieldsToValidate as any);
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
  
  const onSubmit = (data: EventFormValues) => {
    console.log("Form Submitted", data);
    // Final submission logic
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep].component;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  return (
    <div className="relative grid lg:grid-cols-2 min-h-[calc(100vh-4rem)] bg-muted/30 overflow-hidden">
      {/* Left Side: Form Wizard */}
      <div className="flex flex-col justify-center items-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
            <div className="space-y-4">
                {currentStep > 0 && (
                    <Button variant="ghost" onClick={handlePrev} className="text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                )}
                <Progress value={progress} className="h-2" />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <CurrentStepComponent form={form} onNext={handleNext} />
                  </motion.div>
                </AnimatePresence>
              </form>
            </Form>
        </div>
      </div>

      {/* Right Side: Preview */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-background p-8 relative">
        <div className="sticky top-24 w-full max-w-lg space-y-8">
            <div>
                <h3 className="font-semibold text-center mb-2 text-muted-foreground">Event Page Preview</h3>
                <EventPreview eventData={watchedValues} bannerUrl={watchedValues.bannerUrl} />
            </div>
            <div>
                <h3 className="font-semibold text-center mb-2 text-muted-foreground">Ticket Preview</h3>
                <TicketStylePreview eventData={watchedValues} />
            </div>
        </div>
      </div>
    </div>
  );
}
