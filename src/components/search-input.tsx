'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Calendar, MapPin, Locate } from 'lucide-react';
import { useFirestore } from '@/firebase';
import type { Event } from '@/lib/types';
import Link from 'next/link';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SearchInput() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  
  const [suggestions, setSuggestions] = useState<Event[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const fetchSuggestions = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const eventsRef = collection(firestore, 'events');
        const q = query(
            eventsRef, 
            where('name', '>=', debouncedSearchTerm),
            where('name', '<=', debouncedSearchTerm + '\uf8ff'),
            limit(5)
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setSuggestions(results);
      } catch (error) {
        console.error("Error fetching search suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchTerm, firestore]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    const trimmedLocation = locationTerm.trim();

    if (trimmedSearch || trimmedLocation) {
        const params = new URLSearchParams();
        if (trimmedSearch) params.append('q', trimmedSearch);
        if (trimmedLocation) params.append('loc', trimmedLocation);
      router.push(`/events?${params.toString()}`);
      setIsFocused(false);
    }
  };
  
  const handleUseLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'Geolocation not supported' });
        setIsLocating(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // In a real app, you would use a geocoding service here to convert
            // lat/lon to a city/address. For now, we will simulate it.
            toast({ title: "Location found!", description: "City name would appear here." });
            setLocationTerm('Current Location'); // Placeholder
            setIsLocating(false);
        },
        () => {
             toast({ variant: 'destructive', title: 'Unable to retrieve location' });
             setIsLocating(false);
        }
    )
  }

  return (
    <div className="relative w-full bg-background/90 backdrop-blur-lg p-2 rounded-xl shadow-lg border border-white/20" ref={searchContainerRef}>
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-2">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-10 h-14 text-base text-foreground bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        <div className="h-8 w-px bg-border hidden md:block" />
         <div className="relative flex-grow w-full flex items-center">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
             <Input
                placeholder="Location"
                className="pl-10 h-14 text-base text-foreground bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={locationTerm}
                onChange={(e) => setLocationTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleUseLocation}
                disabled={isLocating}
            >
                {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Locate className="h-5 w-5 text-muted-foreground" />}
                <span className="sr-only">Use my location</span>
            </Button>
        </div>
        <Button size="lg" className="font-bold w-full md:w-auto h-14 text-base" type="submit">
          <Search className="mr-2 h-5 w-5" />
          Search
        </Button>
      </form>

      {isFocused && searchTerm.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg border shadow-lg z-10 max-h-80 overflow-y-auto">
          {isLoading && (
             <div className="p-4 text-center text-muted-foreground flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...
             </div>
          )}
          {!isLoading && suggestions.length === 0 && debouncedSearchTerm.length >= 3 && (
            <div className="p-4 text-center text-muted-foreground">No events found matching "{debouncedSearchTerm}".</div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <ul>
              {suggestions.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-accent transition-colors"
                    onClick={() => setIsFocused(false)}
                  >
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-grow font-medium truncate">{event.name}</span>
                  </Link>
                </li>
              ))}
               <li className="p-2 border-t text-center">
                    <Button variant="link" onClick={handleSearchSubmit}>
                        Search for "{searchTerm}"
                    </Button>
               </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
