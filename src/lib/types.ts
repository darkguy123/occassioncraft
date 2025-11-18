
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

export type EventTier = {
    name: string;
    price: number;
    quantity: number;
}

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
  ticketImageUrl?: string;
  ticketBrandingImageUrl?: string;
  vendorId: string;
  organizer?: string; // Can be denormalized
  category?: string; // Can be denormalized
  price: number; // Simplified price, now default for regular/premium
  status?: 'approved' | 'pending' | 'rejected';
  eventType: 'regular' | 'premium' | 'tiered';
  premiumOption?: 'individual' | 'general';
  tiers?: EventTier[];
};

export type UserTicket = {
  ticketId: string;
  eventId: string;
  purchaseDate: string; // ISO 8601 string
  userId: string;
  event?: Event; // Denormalized event data
  isUsed?: boolean;
  vendorId: string; // Denormalized for security rules
  tier?: string; // For tiered events
  attendeeName?: string; // For premium/tiered events
};

export type Vendor = {
  id: string;
  userId: string;
  companyName: string;
  description?: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  pricingTier?: 'Free' | 'Premium' | 'Diamond';
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

export type Wallet = {
  id: string;
  balance: number;
  currency: 'NGN';
}

export type Transaction = {
  id: string;
  walletId: string;
  amount: number;
  type: 'top-up' | 'ticket-sale' | 'payout' | 'refund' | 'adjustment';
  date: string; // ISO 8601 string
  description: string;
  relatedEntityId?: string;
}

export type SupportTicket = {
    id: string;
    userId: string;
    email: string;
    subject: string;
    message: string;
    status: 'open' | 'in-progress' | 'closed';
    createdAt: string; // ISO 8601
}
