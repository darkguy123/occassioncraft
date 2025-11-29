

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
  vendorId: string;
  organizer?: string;
  status?: 'published' | 'draft';
  isPrivate?: boolean; // New field
  authorizedScanners?: string[]; // New field for scanner user IDs
};

export type Ticket = {
  id: string;
  eventId: string;
  vendorId: string; // Denormalized for security rules
  userId: string; // The user who bought/owns the ticket
  purchaseDate: string; // ISO 8601 string
  price: number;
  isPaid: boolean;
  
  // Design & Type
  package: 'Regular' | 'Premium Individual' | 'Premium General' | 'Tiered';
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5';
  templateId: string; // Reference to a design template
  guestPhotoUrl?: string; // For Premium Individual
  class?: 'Regular' | 'VIP' | 'VVIP'; // For Premium Individual

  // Attendee Info
  attendeeName?: string; // For Premium Individual & Tier 4/5
  
  // Validation
  isPrivate: boolean; // For Tier 4/5
  scans: number; // Number of times ticket has been scanned
  maxScans: number; // How many times it CAN be scanned
};


// This is the old UserTicket, which is now simplified into the main Ticket type
// It is kept for reference but can be removed later.
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
