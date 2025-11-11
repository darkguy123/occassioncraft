import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';
import { Ticket } from 'lucide-react';

export function Header() {
  const isLoggedIn = true; // Placeholder for authentication state

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline text-lg">OccasionCraft</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Discover Events
            </Link>
            <Link href="/create-event" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Create an Event
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {isLoggedIn ? (
            <UserNav />
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
