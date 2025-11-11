
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Globe, Music, Palette, Code, Utensils, Award, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const router = useRouter();

  const defaultHeroImage = {
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2F67e206b7d52d22580e4ec0d8_890.jpg?alt=media&token=c0a35579-2cdf-4d20-9aa9-6163ff95eddf',
      imageHint: 'concert stage lights'
  };

  const handleLocationSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && locationQuery.trim() !== '') {
      router.push(`/events?location=${encodeURIComponent(locationQuery.trim())}`);
    }
  };

  const handleSearchClick = () => {
    if (locationQuery.trim() !== '') {
      router.push(`/events?location=${encodeURIComponent(locationQuery.trim())}`);
    } else {
        router.push('/events');
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[80vh] text-white">
        <Image
          src={defaultHeroImage.imageUrl}
          alt="Hero Banner"
          fill
          className="object-cover"
          data-ai-hint={defaultHeroImage.imageHint}
          priority
        />
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
            className="mt-4 text-lg md:text-xl max-w-2xl"
          >
            From concerts to conferences, find live events for all the things you love.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 w-full max-w-3xl bg-white/10 backdrop-blur-lg p-4 rounded-xl shadow-lg border border-white/20"
          >
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search events..." className="pl-10 text-base" />
              </div>
              <AnimatePresence>
                {showLocationSearch && (
                   <motion.div
                      key="location-input"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative flex-grow w-full overflow-hidden"
                    >
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search by location..." 
                            className="pl-10 text-base w-full" 
                            autoFocus 
                            onBlur={() => setShowLocationSearch(false)}
                            value={locationQuery}
                            onChange={(e) => setLocationQuery(e.target.value)}
                            onKeyDown={handleLocationSearch}
                        />
                    </motion.div>
                )}
              </AnimatePresence>
               <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setShowLocationSearch(!showLocationSearch)}>
                    <MapPin className="h-5 w-5" />
                    <span className="sr-only">Search by location</span>
                </Button>
              <Button size="lg" className="font-bold" onClick={handleSearchClick}>
                <Search className="mr-2 h-5 w-5" />
                Find Events
              </Button>
            </div>
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
            <p className="col-span-full text-center text-muted-foreground py-12">No events found. The database has been reset.</p>
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
