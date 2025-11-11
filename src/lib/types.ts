export type Event = {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'Music' | 'Arts' | 'Tech' | 'Food' | 'Sports' | 'Other';
  price: number;
  imageUrl: string;
  imageHint: string;
  organizer: string;
};

export type Ticket = {
  id: string;
  event: Event;
  purchaseDate: string;
};

export type VendorEvent = Event & {
  ticketsSold: number;
  revenue: number;
};
