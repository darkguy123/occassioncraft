export type UserRole = 'user' | 'vendor' | 'admin' | 'scanner';

export type User = {
    id: string;
    uid: string; // Ensure uid is part of User type
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    profileImageUrl?: string;
    dateJoined?: string;
};

export type EventDate = {
  date: string; // ISO 8601 string
  startTime: string;
  endTime?: string;
};

export type Event = {
  id: string;
  name: string;
  dates: EventDate[];
  isOnline: boolean;
  location: string;
  description?: string;
  bannerUrl?: string;
  vendorId: string;
  organizer?: string;
  status?: 'published' | 'draft' | 'pending' | 'rejected';
  isPrivate?: boolean; 
  authorizedScanners?: string[]; 
};

export type TicketCategory = 'Standard' | 'VIP' | 'VVIP' | 'Personal';

export type Ticket = {
  id: string;
  eventId?: string;
  vendorId: string;
  userId: string;
  purchaseDate: string;
  price: number; // Attendee price
  isPaid?: boolean;
  batchId?: string; // To track the publishing transaction
  paystackReference?: string; // Paystack transaction reference
  
  package: TicketCategory; 
  tier?: string;
  templateId?: string;
  ticketImageUrl?: string;
  ticketBrandingImageUrl?: string;
  guestPhotoUrl?: string;
  class?: string;

  attendeeName?: string;
  
  isPrivate: boolean; 
  scans: number;
  maxScans: number;
  lastScannedAt?: string;
};


export type UserTicket = {
  ticketId: string;
  eventId: string;
  purchaseDate: string;
  userId: string;
  event?: Event;
  isUsed?: boolean;
  vendorId: string;
  attendeeName?: string;
  package?: string;
  tier?: string;
  scans?: number;
  maxScans?: number;
  lastScannedAt?: string;
};

export type Vendor = {
  id: string;
  userId: string;
  companyName: string;
  description?: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  pricingTier?: 'Free' | 'Premium' | 'Diamond';
  authorizedScanners?: string[];
}

export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export type SupportTicket = {
    id: string;
    userId: string;
    email: string;
    subject: string;
    message: string;
    status: 'open' | 'in-progress' | 'closed';
    createdAt: string;
}

export type SiteSettings = {
  logoUrl?: string;
  faviconUrl?: string;
  heroBannerUrl?: string;
  primaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  privacyPolicy?: string;
  termsAndConditions?: string;
  aboutUs?: string;
}

export type DataDeletionRequest = {
    id: string;
    userId: string;
    email: string;
    reason: string;
    status: 'pending' | 'completed' | 'rejected';
    createdAt: string;
}
