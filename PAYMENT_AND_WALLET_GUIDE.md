# Payment Gateway, Wallet & Withdrawal System Documentation

## Overview

This system integrates Paystack and Korapay payment gateways, vendor wallet management, withdrawal requests, and transaction auditing for ticket sales on OccassionCraft.

## Architecture

### Payment Gateways

- **Paystack**: Nigerian payment gateway for card, bank transfer, USSD payments
- **Korapay**: Alternative Nigerian gateway for diversified payment options

### Fee Structure

- **Platform Fee**: 5% of all ticket sales
- **Vendor Net**: 95% of ticket sales credited to vendor wallet

### Components

1. **Payment Initialization** (`/api/payments/initialize`)
   - Initializes checkout on selected gateway
   - Stores pending transaction state in localStorage
   - Returns checkout URL for redirect

2. **Payment Verification** (`/api/payments/verify`)
   - Verifies transaction success with payment gateway
   - Called after customer returns from payment gateway
   - Creates ticket upon verification

3. **Webhook Handlers**
   - `/api/webhooks/paystack`: Receives Paystack payment confirmations
   - `/api/webhooks/korapay`: Receives Korapay payment confirmations
   - Auto-logs transactions to audit collection

4. **Vendor Wallet** (`/vendor/wallet`)
   - Shows gross sales, platform fees, net credits
   - Displays available balance (credits - pending withdrawals - paid outs)
   - Request withdrawal form with bank details

5. **Withdrawal Requests** (`/admin/withdrawals`)
   - Admin can view all pending/approved/paid withdrawal requests
   - Approve or reject pending requests
   - Mark approved requests as paid

6. **Transaction Auditing** (`/api/audit/log-transaction`)
   - Records all transactions for reconciliation
   - Accessible only to admins in dashboard

## Setup Instructions

### Quick Migration From Hardcoded Keys (One Command)

If you are temporarily using hardcoded payment keys in code and want to move them back into Firebase App Hosting secrets later without manual file edits, use:

```bash
npm run secrets:apphosting:bootstrap -- --project=YOUR_FIREBASE_PROJECT_ID
```

What this command does:

- Reads the current hardcoded Paystack/Korapay keys from the payment config files.
- Creates/updates App Hosting secrets using Firebase CLI.
- Grants backend access to those secrets.
- Updates `apphosting.yaml` with secret references for:
  - `PAYSTACK_SECRET_KEY`
  - `KORAPAY_SECRET_KEY`
  - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
  - `NEXT_PUBLIC_KORAPAY_PUBLIC_KEY`

After that, commit `apphosting.yaml` and trigger a rollout.

When you are ready to remove hardcoded fallbacks from source code:

```bash
npm run payments:dehardcode
```

Then deploy again so only App Hosting/environment secrets are used.

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Korapay
KORAPAY_SECRET_KEY=your_korapay_secret_key
NEXT_PUBLIC_KORAPAY_PUBLIC_KEY=your_korapay_public_key
KORAPAY_PUBLIC_KEY=your_korapay_public_key

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Configure Webhooks in Payment Dashboards

#### Paystack Dashboard
1. Go to Settings → API Keys & Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/paystack`
3. Webhook events to enable:
   - `charge.success`
   - `charge.failed`

#### Korapay Dashboard
1. Go to API Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/korapay`
3. Webhook events to enable:
   - `charge.success`
   - `charge.failed`

### 3. Database Collections

The system uses these Firestore collections:

- `tickets` - Ticket documents with `platformFeeAmount` and `vendorNetAmount` fields
- `withdrawalRequests` - Vendor withdrawal requests awaiting admin approval
- `transactionAudits` - Complete transaction history for all sales and fees
- `vendors` - Vendor profiles

### 4. Firestore Rules

Rules are configured in `firestore.rules`:

```firestore
// Withdrawal Requests - Vendors can only see their own
match /withdrawalRequests/{requestId} {
  allow create: if request.auth != null && request.resource.data.vendorId == request.auth.uid;
  allow get, list: if isAdmin() || (request.auth != null && resource.data.vendorId == request.auth.uid);
  allow update, delete: if isAdmin();
}

// Transaction Audits - Admin only
match /transactionAudits/{auditId} {
  allow list, get: if isAdmin();
  allow create: if isAdmin();
}
```

## User Flows

### Attendee Ticket Purchase

1. Attendee selects event → clicks "Get Tickets"
2. Selects ticket category and payment gateway
3. Gets redirected to Paystack/Korapay checkout
4. After payment, callback returns to `/events/[eventId]?gateway=paystack&reference=txn_xxx`
5. System verifies payment with gateway
6. Ticket is created and credited to vendor's wallet

### Vendor Withdrawal Request

1. Vendor goes to `/vendor/wallet`
2. Views wallet metrics (gross sales, fees deducted, available balance)
3. Fills withdrawal form with bank details
4. Submits request (creates `withdrawalRequests` document with `pending` status)
5. Request appears in admin panel

### Admin Withdrawal Approval

1. Admin goes to `/admin/withdrawals`
2. Views pending requests and total amounts
3. Approves requests → status changes to `approved`
4. Once payout is sent, marks as `paid`
5. Vendor can view history in wallet page

### Transaction Auditing

1. Every ticket sale is logged to `transactionAudits`
2. Webhook events auto-create audit records
3. Admin can query audits for reconciliation
4. Audits include: amount, fees, gateway, status, metadata

## Data Models

### Ticket (Updated)
```typescript
{
  id: string;
  eventId: string;
  vendorId: string;
  userId: string;
  price: number; // Attendee paid amount
  platformFeeAmount: number; // 5% fee
  vendorNetAmount: number; // 95% net
  paymentGateway: 'paystack' | 'korapay';
  transactionReference: string;
  isPaid: boolean;
  purchaseDate: string;
  // ... other fields
}
```

### WithdrawalRequest
```typescript
{
  id: string;
  vendorId: string;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  note?: string;
}
```

### TransactionAudit
```typescript
{
  id: string;
  type: 'ticket_purchase' | 'withdrawal_request' | 'withdrawal_payout' | 'platform_fee' | 'refund';
  vendorId?: string;
  userId?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  description: string;
  reference?: string;
  gateway?: 'paystack' | 'korapay';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}
```

## UI Components

### Ticket Cards
New `TicketCard` component displays tickets with event banner images:
- Shows event image as thumbnail
- Displays attendee name and price
- Shows check-in status
- Includes share and view details buttons
- Used in `/vendor/tickets` page

### Admin Withdrawals Page
- Grid view of withdrawal metrics (pending, approved, paid, rejected)
- Table of all requests with approve/reject/paid actions
- Confirmation dialogs before actions

### Vendor Wallet Page
- Key metrics: gross sales, platform fees, wallet credits, available balance
- Withdrawal request form
- History table of past requests

## Testing Webhooks Locally

For local development, use ngrok to expose your local server:

```bash
ngrok http 3000
# Use ngrok URL: https://xxxxx.ngrok.io/api/webhooks/paystack
```

Test webhook with curl:
```bash
curl -X POST http://localhost:3000/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: <calculated_hash>" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "txn_123",
      "amount": 50000,
      "currency": "NGN",
      "customer": {"email": "test@example.com"}
    }
  }'
```

## Security Notes

- Secret keys are kept in `.env.local` (never committed)
- Webhook signatures are verified against secret keys
- Admin-only operations are gated by Firestore rules
- Transaction verification happens server-side
- All sensitive data is logged to transactionAudits for audit trail

## Troubleshooting

### Webhook Not Triggered
- Verify webhook URL is publicly accessible
- Check gateway dashboard for webhook delivery logs
- Ensure secret key matches in environment

### Ticket Not Created After Payment
- Check browser console for errors
- Verify payment gateway returned correct reference
- Check `/api/payments/verify` response
- Review transactionAudits collection

### Withdrawal Request Not Appearing
- Verify vendor UID matches in withdrawalRequests doc
- Check Firestore rules allow the vendor to create docs
- Ensure bankName/accountNumber/accountName are filled

### Platform Fee Not Deducted
- Check calculatePlatformFee() helper in `/lib/payments.ts`
- Verify ticket has `platformFeeAmount` and `vendorNetAmount` fields
- Check dashboard calculations use these fields
