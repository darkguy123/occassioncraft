import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, CalendarDays, Ticket } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sampleEvents } from '@/lib/placeholder-data';
import EventCard from '@/components/event-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[60vh] text-white">
        {heroImage && (
             <Image
             src={heroImage.imageUrl}
             alt={heroImage.description}
             fill
             className="object-cover"
             data-ai-hint={heroImage.imageHint}
           />
        )}
        <div className="absolute inset-0 bg-black/50" />
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
            <TabsTrigger value="arts">Arts & Culture</TabsTrigger>
            <TabsTrigger value="tech">Tech</TabsTrigger>
            <TabsTrigger value="food">Food & Drink</TabsTrigger>
            <TabsTrigger value="sports">Sports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sampleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="music">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sampleEvents.filter(e => e.category === 'Music').map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
           <TabsContent value="arts">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sampleEvents.filter(e => e.category === 'Arts').map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
           <TabsContent value="tech">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sampleEvents.filter(e => e.category === 'Tech').map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
           <TabsContent value="food">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sampleEvents.filter(e => e.category === 'Food').map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
            <Button variant="outline" size="lg">Load More Events</Button>
        </div>
      </div>
    </div>
  );
}
