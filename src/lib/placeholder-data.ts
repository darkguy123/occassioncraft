
import type { Event, UserTicket, User, Vendor } from './types';

// Helper function to get a future date
const futureDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(20, 0, 0, 0); // Set to 8:00 PM
  return date.toISOString();
};


export const sampleEvents: Event[] = [
  {
    id: '1',
    name: 'Summer Music Fest 2024',
    date: futureDate(15),
    location: 'Central Park, New York',
    organizer: 'MusicNow Events',
    imageUrl: 'https://picsum.photos/seed/event1/600/400',
    imageHint: 'music festival',
    category: 'Music',
    price: 75.00,
  },
  {
    id: '2',
    name: 'Annual Tech Summit',
    date: futureDate(30),
    location: 'Moscone Center, San Francisco',
    organizer: 'TechCon',
    imageUrl: 'https://picsum.photos/seed/event2/600/400',
    imageHint: 'tech conference',
    category: 'Tech',
    price: 199.99,
  },
  {
    id: '3',
    name: 'International Food & Wine Festival',
    date: futureDate(5),
    location: 'Grand Pier, Chicago',
    organizer: 'TasteBuds Inc.',
    imageUrl: 'https://picsum.photos/seed/event3/600/400',
    imageHint: 'food festival',
    category: 'Food',
    price: 50.00,
  },
   {
    id: '4',
    name: 'Modern Art Exhibition: "Dimensions"',
    date: futureDate(22),
    location: 'The Modern Gallery, Los Angeles',
    organizer: 'ArtHouse',
    imageUrl: 'https://picsum.photos/seed/event4/600/400',
    imageHint: 'art gallery',
    category: 'Arts',
    price: 25.00,
  },
];

export const userTickets: UserTicket[] = [
    { ticketId: 'tkt001', eventId: '1', purchaseDate: new Date().toISOString() },
    { ticketId: 'tkt002', eventId: '3', purchaseDate: new Date().toISOString() },
];


export const vendorEvents = [];
