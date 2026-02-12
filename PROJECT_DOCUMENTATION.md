# OccasionCraft Project Documentation

## 1. Project Overview

OccasionCraft is a comprehensive, full-stack web application designed to be an all-in-one platform for event management and ticketing. It connects event organizers (Vendors) with attendees (Users) through a seamless, feature-rich interface.

The platform allows vendors to create and manage events, design and sell custom digital tickets, and track sales. Users can discover events, purchase tickets, and manage them in a personal dashboard. The system also includes a robust admin panel for platform oversight and a QR code-based validation system for secure event entry.

## 2. Core Features

The application is built around a role-based user system, providing tailored experiences for different user types.

### 2.1 User Features
- **Authentication**: Secure sign-up and login with email and password.
- **Event Discovery**: Browse, search, and filter a public list of upcoming events.
- **Ticket Viewing**: View purchased tickets, each with a unique QR code.
- **User Dashboard**: A personal space to see all tickets for upcoming events.
- **Profile Management**: Users can update their personal information and profile picture.
- **PWA Support**: The application can be installed on a mobile device for an app-like experience.

### 2.2 Vendor Features
- **Vendor Registration**: Users can apply to become a vendor. Applications are reviewed and approved by an Admin.
- **Vendor Dashboard**: A central hub for vendors to manage their events, track revenue, and see total tickets crafted.
- **Event Creation**: A simple form to create new "event shells." A banner image is automatically generated using AI.
- **Ticket Crafting**: A powerful interface to design and configure different packages of tickets (e.g., Regular, Premium, Tiered) and link them to an event.
- **QR Code Scanning**: A dedicated validation page (`/validate`) allows authorized users to scan ticket QR codes using their device's camera to check attendees in.
- **Scanner Management**: Vendors can authorize specific users to be scanners for their events.
- **Checkout & Payments**: A cart system for purchasing ticket batches, integrated with Paystack for payments in NGN.

### 2.3 Admin Features
- **Admin Dashboard**: An overview of platform activity, including total revenue, users, vendors, and events, presented with charts.
- **Vendor Approval System**: Admins can review, approve, or reject vendor applications.
- **User Management**: Admins can view all users and manage their roles (e.g., grant admin or vendor status).
- **Event Management**: Admins have full CRUD (Create, Read, Update, Delete) access over all events on the platform.
- **Site Settings**: A comprehensive settings panel to manage the website's branding (logo, favicon), theme colors, homepage content, and legal pages (Privacy Policy, Terms).

## 3. Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with ShadCN UI for pre-built, accessible components.
- **Database**: Google Firestore (NoSQL) for all application data.
- **Authentication**: Firebase Authentication (Email/Password).
- **File Storage**: Firebase Storage for user-uploaded images (avatars, ticket branding).
- **Generative AI**: Google Genkit for server-side AI-powered image generation (for event banners).
- **Payments**: Paystack for processing payments.
- **Deployment**: Firebase App Hosting.

## 4. Project Structure

The project follows a standard Next.js App Router structure.

- `src/app/`: Contains all pages and routes.
  - `(auth)/`: Routes for login, sign-up, etc.
  - `(vendor)/`: Protected routes for the vendor dashboard.
  - `admin/`: Protected routes for the admin panel.
  - `api/`: API routes (if any).
  - `layout.tsx`: The root layout for the entire application.
  - `page.tsx`: The homepage.
- `src/components/`: Reusable React components.
  - `shared/`: Components used across the app (Header, Footer).
  - `ui/`: Core UI elements from ShadCN (Button, Card, etc.).
  - `vendor/`, `admin/`: Components specific to those sections.
- `src/firebase/`: Configuration, hooks, and utility functions for interacting with Firebase.
  - `config.ts`: Firebase project configuration keys.
  - `provider.tsx`: Core Firebase context provider.
  - `use-collection.tsx` / `use-doc.tsx`: Hooks for real-time data fetching.
- `src/ai/`: Contains Genkit flows for AI functionality.
  - `flows/`: Specific AI tasks, like generating images.
- `src/lib/`: Shared utilities and type definitions.
  - `types.ts`: TypeScript types for the data model (Events, Tickets, etc.).
- `docs/backend.json`: A JSON schema representation of the Firestore data model.
- `firestore.rules`: Security rules for the Firestore database.
- `storage.rules`: Security rules for Firebase Storage.

## 5. Data Model Overview

Data is stored in Firestore with the following primary collections:

- `/users/{userId}`: Stores public user profile information, including their roles.
- `/vendors/{vendorId}`: Stores information about approved vendors, including their company name and application status. The `vendorId` is the same as the user's `userId`.
- `/events/{eventId}`: Stores information about each event, such as name, date, location, and a reference to the vendor who created it.
- `/tickets/{ticketId}`: The central collection for all tickets. Each document contains details about the ticket's design, price, and validation rules.
- `/settings/site`: A single document that holds all global website settings configured from the admin panel.

## 6. Getting Started Locally

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.
