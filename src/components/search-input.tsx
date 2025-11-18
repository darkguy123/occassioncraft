'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Calendar } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import Link from 'next/link';

export function SearchInput() {
  const router = useRouter();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [suggestions, setSuggestions] = useState<Event[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
        // This is a simple prefix match query. For full-text search, a more advanced
        // solution like Algolia or a dedicated search service would be better.
        const q = query(
            eventsRef, 
            where('name', '>=', debouncedSearchTerm),
            where('name', '<=', debouncedSearchTerm + '\uf8ff'),
            limit(5)
        );
        const querySnapshot = await (await import('firebase/firestore')).getDocs(q);
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
    if (searchTerm.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsFocused(false);
    }
  };

  return (
    <div className="relative w-full bg-white/10 backdrop-blur-lg p-4 rounded-xl shadow-lg border border-white/20" ref={searchContainerRef}>
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search events by name..."
            className="pl-10 text-base text-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        <Button size="lg" className="font-bold" type="submit">
          <Search className="mr-2 h-5 w-5" />
          Find Events
        </Button>
      </form>

      {isFocused && (searchTerm.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg border shadow-lg z-10 max-h-80 overflow-y-auto">
          {isLoading && (
             <div className="p-4 text-center text-muted-foreground flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...
             </div>
          )}
          {!isLoading && suggestions.length === 0 && debouncedSearchTerm.length >= 3 && (
            <div className="p-4 text-center text-muted-foreground">No events found.</div>
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
