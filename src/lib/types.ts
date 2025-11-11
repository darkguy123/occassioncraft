

export type UserRole = 'user' | 'vendor' | 'admin';

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    profileImageUrl?: string;
    dateJoined?: string;
};

export type Event = {
  id: string;
  name: string;
  date: string; // ISO 8601 string
  startTime: string;
  endTime?: string;
  isOnline: boolean;
  location: string;
  description?: string;
  bannerUrl?: string;
  ticketImageUrl?: string; // Changed from ticketStyle
  vendorId: string;
  organizer?: string; // Can be denormalized
  category?: string; // Can be denormalized
  price: number; // Simplified price
};

export type UserTicket = {
  ticketId: string;
  eventId: string;
  purchaseDate: string; // ISO 8601 string
  userId: string;
  event?: Event; // Denormalized event data
};

export type Vendor = {
  id: string;
  userId: string;
  companyName: string;
  description?: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string; // ISO 8601 string
  read: boolean;
  link?: string;
}
