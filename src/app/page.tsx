
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Globe, Music, Palette, Code, Utensils, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventCard from '@/components/event-card';
import { useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


const categoryIcons = {
  All: Globe,
  Music: Music,
  Arts: Palette,
  Tech: Code,
  Food: Utensils,
  Sports: Award,
};

const categories = ['All', 'Music', 'Arts', 'Tech', 'Food', 'Sports'] as const;


export default function Home() {
  const defaultHeroImage = {
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2F67e206b7d52d22580e4ec0d8_890.jpg?alt=media&token=c0a35579-2cdf-4d20-9aa9-6163ff95eddf',
      imageHint: 'concert stage lights'
  };
  const [heroBannerUrl, setHeroBannerUrl] = useState(defaultHeroImage?.imageUrl);
  const [heroBannerHint, setHeroBannerHint] = useState(defaultHeroImage?.imageHint);

  const firestore = useFirestore();
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Only fetch approved events for the public homepage
    return query(collectionGroup(firestore, 'events'), where('status', '==', 'approved'));
  }, [firestore]);

  const { data: events, isLoading } = useCollection<Event>(eventsQuery);


  useEffect(() => {
    const savedBanner = localStorage.getItem('heroBannerImage');
    if (savedBanner) {
      setHeroBannerUrl(savedBanner);
      setHeroBannerHint('custom banner');
    }

    const handleStorageChange = () => {
      const updatedBanner = localStorage.getItem('heroBannerImage');
      if (updatedBanner) {
        setHeroBannerUrl(updatedBanner);
        setHeroBannerHint('custom banner');
      } else {
        setHeroBannerUrl(defaultHeroImage?.imageUrl);
        setHeroBannerHint(defaultHeroImage?.imageHint);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const renderEventList = (filteredEvents?: Event[]) => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
      ));
    }

    if (!filteredEvents || filteredEvents.length === 0) {
        return <p className="col-span-full text-center text-muted-foreground">No events found in this category.</p>;
    }

    return filteredEvents.map((event) => (
        <EventCard key={event.id} event={event} />
    ));
  };


  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[60vh] text-white">
        {heroBannerUrl && (
             <Image
             src={heroBannerUrl}
             alt="Hero Banner"
             fill
             className="object-cover"
             data-ai-hint={heroBannerHint}
             priority
           />
        )}
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Discover Your Next Experience</h1>
          <p className="mt-4 text-lg md:text-xl max-w-2xl">From concerts to conferences, find live events for all the things you love.</p>
          <div className="mt-8 w-full max-w-3xl bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-2xl">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search events..." className="pl-10 text-base" />
              </div>
              <Button size="lg" className="font-bold">
                <Search className="mr-2 h-5 w-5" />
                Find Events
              </Button>
            </div>
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {renderEventList(events || [])}
            </div>
          </TabsContent>
          <TabsContent value="music">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {renderEventList(events?.filter(e => e.category === 'Music'))}
            </div>
          </TabsContent>
           <TabsContent value="arts">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {renderEventList(events?.filter(e => e.category === 'Arts'))}
            </div>
          </TabsContent>
           <TabsContent value="tech">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {renderEventList(events?.filter(e => e.category === 'Tech'))}
            </div>
          </TabsContent>
           <TabsContent value="food">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {renderEventList(events?.filter(e => e.category === 'Food'))}
            </div>
          </TabsContent>
           <TabsContent value="sports">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {renderEventList(events?.filter(e => e.category === 'Sports'))}
             </div>
           </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
            <Button variant="outline" size="lg">Load More Events</Button>        </div>
      </div>
    </div>
  );
}

    