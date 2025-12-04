
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '@/firebase';

const welcomeSlides = [
  {
    image: '/images/welcome-create.svg',
    title: 'Create Your Event',
    description: 'Effortlessly set up any event, from large concerts to private gatherings.',
  },
  {
    image: '/images/welcome-craft.svg',
    title: 'Craft Beautiful Tickets',
    description: 'Design and customize unique digital tickets that go beyond just entry.',
  },
  {
    image: '/images/welcome-buy.svg',
    title: 'Discover & Attend',
    description: 'Explore a world of events and secure your spot in seconds.',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { siteSettings, isSiteSettingsLoading } = useFirebase();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useState(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  });

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    router.push('/');
  };

  const handleLogin = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    router.push('/login');
  }
  
  const logoUrl = '/recommenoptimized.png';


  return (
    <div className="h-screen w-full flex flex-col justify-between p-8 bg-background">
      <header className="flex justify-center">
         {isSiteSettingsLoading ? (
            <div className="h-8 w-36 bg-muted rounded-md animate-pulse" />
        ) : (
            <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" unoptimized/>
        )}
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {welcomeSlides.map((slide, index) => (
              <CarouselItem key={index}>
                <div className="text-center p-4">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: current === index ? 1 : 0.5, scale: current === index ? 1 : 0.8 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center"
                  >
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      width={300}
                      height={300}
                      className="w-full max-w-[300px] h-auto"
                    />
                  </motion.div>
                  <h2 className="text-2xl font-headline font-bold mt-8">{slide.title}</h2>
                  <p className="text-muted-foreground mt-2 max-w-xs mx-auto">{slide.description}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="flex justify-center gap-2 mt-8">
          {welcomeSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={`h-2 w-2 rounded-full transition-all ${current === i ? 'w-6 bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
      </main>

      <footer className="space-y-4">
        <Button size="lg" className="w-full" onClick={handleGetStarted}>
          Get Started
        </Button>
        <div className="text-center text-sm">
            Already have an account?{' '}
            <Button variant="link" onClick={handleLogin} className="p-0 h-auto">
                Log in
            </Button>
        </div>
      </footer>
    </div>
  );
}
