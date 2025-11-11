
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

export type Vendor = {
  id: string;
  userId: string;
  companyName: string;
  description?: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  link?: string;
};

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
    dateJoined?: string;
};
