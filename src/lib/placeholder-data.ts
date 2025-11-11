

import type { Event, UserTicket } from './types';

// This file is for placeholder data. In a real application, this data would
// be fetched from a database like Firestore. We are keeping it for now
// to ensure parts of the UI that haven't been migrated yet don't break.

// Helper function to get a future date
const futureDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(20, 0, 0, 0); // Set to 8:00 PM
  return date.toISOString();
};


export const sampleEvents: Event[] = [
  // This data is now fetched from Firestore. This is just a fallback.
];

export const userTickets: Omit<UserTicket, 'userId'>[] = [
    // This data is now fetched from Firestore.
];
