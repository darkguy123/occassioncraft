
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Globe, Music, Palette, Code, Utensils, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import EventCard from '@/components/event-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/search-input';
import { useEffect, useState } from 'react';

const categoryIcons = {
  All: Globe,
  Music: Music,
  Arts: Palette,
  Tech: Code,
  Food: Utensils,
  Sports: Award,
};

const categories = ['All', 'Music', 'Arts', 'Tech', 'Food', 'Sports'] as const;

const defaultHero = {
  imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2F67e206b7d52d22580e4ec0d8_890.jpg?alt=media&token=c0a35579-2cdf-4d20-9aa9-6163ff95eddf',
  imageHint: 'concert stage lights'
};

export default function Home() {
  const firestore = useFirestore();
  const eventsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'events') : null, [firestore]);
  const { data: events, isLoading } = useCollection<Event>(eventsCollection);

  const [heroImage, setHeroImage] = useState(defaultHero);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if(hasMounted) {
      const loadHero = () => {
        const savedHero = localStorage.getItem('heroBannerImage');
        if (savedHero) {
          setHeroImage({ imageUrl: savedHero, imageHint: 'custom banner' });
        } else {
          setHeroImage(defaultHero);
        }
      }
      loadHero();

      window.addEventListener('storage', loadHero);
      return () => {
        window.removeEventListener('storage', loadHero);
      }
    }
  }, [hasMounted]);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[80vh] text-white">
        {hasMounted ? (
            <Image
              src={heroImage.imageUrl}
              alt="Hero Banner"
              fill
              className="object-cover"
              data-ai-hint={heroImage.imageHint}
              priority
            />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-headline font-bold"
          >
            Discover Your Next Experience
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg md:text-xl max-w-2xl text-white"
          >
            From concerts to conferences, find live events for all the things you love.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 w-full max-w-2xl"
          >
            <SearchInput />
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 w-full justify-start overflow-x-auto h-auto bg-transparent p-0">
             {categories.map((category) => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <TabsTrigger key={category} value={category.toLowerCase()} className="flex-shrink-0">
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{category === 'Arts' ? 'Arts & Culture' : category === 'Food' ? 'Food & Drink' : category}</span>
                  </TabsTrigger>
                );
              })}
          </TabsList>
          
          <TabsContent value="all">
             {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
                ))}
              </div>
             )}
             {!isLoading && events && events.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {events.map(event => <EventCard key={event.id} event={event} />)}
                </div>
             ) : (
                !isLoading && (
                  <p className="col-span-full text-center text-muted-foreground py-12">No events found. Create one to get started!</p>
                )
             )}
          </TabsContent>
          {categories.slice(1).map(cat => (
            <TabsContent key={cat} value={cat.toLowerCase()}>
               <p className="col-span-full text-center text-muted-foreground py-12">No events found in this category.</p>
            </TabsContent>
          ))}
        </Tabs>

        <div className="text-center mt-12">
            <Button variant="outline" size="lg" asChild>
                <Link href="/events">Load More Events</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
