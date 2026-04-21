# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture Overview

**Mamalu Kitchen** is a full-stack culinary platform built with Next.js (App Router), TypeScript, Tailwind CSS v4, Sanity CMS, Supabase, and Stripe.

### Dual Content Sources

Content comes from two separate backends that must be kept in sync conceptually:
- **Sanity CMS** (`/studio` route) — public-facing content: blogs, recipes, products, cooking classes, press, and page content. Queries are GROQ-based, centralized in `src/lib/sanity/queries.ts`.
- **Supabase (PostgreSQL)** — transactional data: bookings, orders, invoices, leads, payment links, user profiles, and admin features. Client helpers in `src/lib/supabase/` split into `client.ts` (browser), `server.ts` (server components/API routes), and `admin.ts` (service role).

### Routing Structure

- `src/app/(public pages)/` — customer-facing routes (`/blogs`, `/recipes`, `/classes`, `/products`, `/services`, etc.)
- `src/app/admin/` — admin portal with 25+ sections (analytics, bookings, invoices, leads, menus, orders, rentals, scanner, whatsapp, etc.)
- `src/app/api/` — 50+ REST API routes under `/api/admin/*`, `/api/auth/*`, `/api/bookings/*`, `/api/payments/*`, etc.
- `src/app/studio/` — embedded Sanity Studio CMS

The root layout (`src/app/layout.tsx`) conditionally excludes Header/Footer for admin and studio paths via a pathname header set in middleware.

### Authentication & Authorization

`src/middleware.ts` refreshes Supabase sessions on every request. API route authorization is handled by `src/lib/auth/api-auth.ts`:
- `verifyAuth()` — returns current user + role
- `requireAuth(role?)` — throws 401/403 if unauthorized

Roles: `staff`, `admin`, `super_admin`.

### State Management

No global state library. State is managed via:
- React `useState` / `useEffect` for local component state
- `localStorage` key `mamalu_cart` for cart persistence
- `ScrollAnimationContext` (in `src/components/providers/ScrollAnimationProvider.tsx`) — the only Context API usage, used to trigger GSAP ScrollTrigger refresh

### GSAP Animations

Scroll-based animations use GSAP + ScrollTrigger. Apply CSS classes to elements and the provider handles the rest: `.anim-fade-up`, `.anim-scale`, `.anim-slide-left`, `.anim-slide-right`, `.anim-stagger`, `.img-reveal`, `.parallax`, `.float-element`.

### Key Utilities

All in `src/lib/utils.ts`:
- `cn()` — merge Tailwind classes (clsx + twMerge)
- `formatPrice(amount)` — formats to AED currency (en-AE locale)
- `formatDate(date)` — formats dates in en-AE locale

### TypeScript Types

All shared interfaces live in `src/types/index.ts`: `Blog`, `Recipe`, `Product`, `CookingClass`, `Press`, `User`, `Order`, `Booking`, `CartItem`, etc.

### Path Aliases

`@/*` maps to `./src/*` — use this consistently for imports.

### External Integrations

- **Stripe** — payments for products and classes; webhook handled at `/api/payments`
- **Resend** — transactional email
- **Twilio** — SMS notifications
- **WhatsApp API** — customer communication (see `WHATSAPP_SETUP_GUIDE.md`)
- **Vercel Cron** — daily balance reminders at 5 AM via `/api/cron/balance-reminders`

### Required Environment Variables

```
NEXT_PUBLIC_SANITY_PROJECT_ID
NEXT_PUBLIC_SANITY_DATASET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
```
Plus Twilio, WhatsApp, and Resend credentials.
