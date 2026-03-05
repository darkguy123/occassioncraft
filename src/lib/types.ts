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
  eventId?: string; // Optional: Tickets can be created without an event
  vendorId: string; // Denormalized for security rules
  userId: string; // The user who bought/owns the ticket
  purchaseDate: string; // ISO 8601 string
  price: number; // The price defined by the vendor for the end user
  isPaid?: boolean; // Whether the vendor paid the platform fee for this ticket
  
  // Design & Type from new ticket crafting flow
  package: TicketCategory; 
  tier?: string; // Kept for backward compatibility or future use
  templateId?: string; // Reference to a design template
  ticketImageUrl?: string; // Background image for the ticket
  ticketBrandingImageUrl?: string; // Branding image (e.g., logo on top)
  guestPhotoUrl?: string; // For Personal tickets
  class?: string; // Extra class info if needed

  // Attendee Info
  attendeeName?: string; // For Personal tickets
  
  // Validation & Sharing
  isPrivate: boolean; 
  scans: number; // Number of times ticket has been scanned
  maxScans: number; // How many times it CAN be scanned
  lastScannedAt?: string; // ISO 8601 string of the last scan
};


// This represents a ticket in a user's collection
export type UserTicket = {
  ticketId: string;
  eventId: string;
  purchaseDate: string; // ISO 8601 string
  userId: string;
  event?: Event; // Denormalized event data
  isUsed?: boolean;
  vendorId: string; // Denormalized for security rules
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
  createdAt: string; // ISO 8601 string
  pricingTier?: 'Free' | 'Premium' | 'Diamond';
  authorizedScanners?: string[];
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

export type SupportTicket = {
    id: string;
    userId: string;
    email: string;
    subject: string;
    message: string;
    status: 'open' | 'in-progress' | 'closed';
    createdAt: string; // ISO 8601
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
    createdAt: string; // ISO 8601 string
}
