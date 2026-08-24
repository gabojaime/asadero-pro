# Next.js App Router Page and View Routing Map

This specification maps the Next.js App Router directories to the Presentation Layer (Builders) of our Hexagonal Architecture. It guides the AI agents in structuring the application routes, auth layouts, and view integrations.

---

## 1. Directory Tree & Route Map

All routes live inside the `app/` directory. Route Groups `(auth)` and `(app)` are utilized to isolate layout structures without affecting URLs.

```text
app/
├── layout.tsx                # Root layout: initializes TanStack QueryClient, Theme, global CSS
├── page.tsx                  # Public Root: landing page / redirector to /login or /dashboard
├── (auth)/                   # Route Group: Authentication (No URL path impact)
│   ├── layout.tsx            # Auth Layout: Centered card branding, background images
│   ├── login/
│   │   └── page.tsx          # Route: /login (Sign In component)
│   └── register/
│       └── page.tsx          # Route: /register (Sign Up / Merchant creation component)
└── (app)/                    # Route Group: Protected Application Area
    ├── layout.tsx            # Main Layout: Navigation Sidebar, Merchant Context, RLS state
    ├── dashboard/
    │   └── page.tsx          # Route: /dashboard (Interatctive financial & operational charts)
    ├── inventory/
    │   └── page.tsx          # Route: /inventory (Raw materials tracking, unit converter)
    ├── orders/
    │   ├── page.tsx          # Route: /orders (Active orders list, tables grid, cart taker)
    │   └── [orderId]/
    │       └── page.tsx      # Route: /orders/[orderId] (Single order details and checkout)
    └── waste/
        └── page.tsx          # Route: /waste (Parrilla meat waste logs & reasons entry)
```

---

## 2. Global Root Layout (`app/layout.tsx`)

Bootstraps global clients and wraps the viewport with essential providers (Auth, TanStack Query, Theme).

```tsx
// app/layout.tsx (Server Component by default)
import { Inter } from 'next/font/google';
import QueryProvider from '@/src/shared/infrastructure/providers/QueryProvider';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Steakhouse Manager MVP',
  description: 'Clean Architecture management for small grills and meat businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased bg-gray-50 text-gray-900">
        {/* TanStack QueryProvider wraps client state across all routing segments */}
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## 3. Auth Route Group Layout & Pages

### 3.1 Auth Layout (`app/(auth)/layout.tsx`)
Enforces a standard container style (e.g., side split or central card) for both `login` and `register` pages.

```tsx
// app/(auth)/layout.tsx (Server Component)
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-white">
      {/* Visual branding container */}
      <section className="hidden md:flex md:w-1/2 bg-cover bg-center relative" style={{ backgroundImage: "url('/images/grill-bg.jpg')" }}>
        <div className="absolute inset-0 bg-black/60 flex flex-col justify-center p-12">
          <h1 className="text-4xl font-extrabold tracking-tight">Steakhouse MVP</h1>
          <p className="mt-4 text-gray-300 max-w-md">
            Optimize your grilling yields, track every gram of meat, and keep food costs under strict control.
          </p>
        </div>
      </section>

      {/* Form wrapper */}
      <section className="flex-1 flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md">
          {children}
        </div>
      </section>
    </main>
  );
}
```

### 3.2 Login Page (`app/(auth)/login/page.tsx`)
Renders the login flow, invoking the login Case Study via Presentation Hooks.

```tsx
// app/(auth)/login/page.tsx (Client Component)
'use client';

import LoginForm from '@/src/modules/auth/presentation/components/LoginForm';

export default function LoginPage() {
  return (
    <article className="space-y-6">
      <header className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-gray-400 text-sm">Please enter your credentials to access your merchant metrics</p>
      </header>
      
      {/* Presentation Component containing React Query auth mutations */}
      <LoginForm />
    </article>
  );
}
```

---

## 4. Protected App Route Group Layout & Pages

### 4.1 Protected App Layout (`app/(app)/layout.tsx`)
Verifies user authentication, injects current merchant session context, and provides global sidebar navigation.

```tsx
// app/(app)/layout.tsx (Client Component)
'use client';

import React from 'react';
import Sidebar from '@/src/shared/presentation/components/Sidebar';
import Header from '@/src/shared/presentation/components/Header';
import { useAuthSession } from '@/src/modules/auth/presentation/hooks/useAuthSession';
import { useRouter } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isLoading } = useAuthSession();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Verifying active session...</p>
      </div>
    );
  }

  // Session guard redirecting to auth if invalid
  if (!session) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-row bg-gray-100">
      {/* Global application sidebar navigation */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main top header with current merchant info and profile triggers */}
        <Header merchantName={session.merchant.name} />

        {/* Dynamic page viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

## 5. Main Functional Views Integration

### 5.1 Dashboard / Metrics (`app/(app)/dashboard/page.tsx`)
Integrates interactive financial and operational widgets using lazy loading to avoid rendering lag.

```tsx
// app/(app)/dashboard/page.tsx (Client Component)
'use client';

import dynamic from 'next/dynamic';
import MetricCardsGrid from '@/src/modules/metrics/presentation/components/MetricCardsGrid';

// Lazy loading heavy charting libraries to optimize Initial Bundle Size (CLS-Friendly)
const DynamicFinancialChart = dynamic(
  () => import('@/src/modules/metrics/presentation/components/FinancialChart'),
  { loading: () => <div className="h-72 bg-white animate-pulse rounded-xl" /> }
);

const DynamicOperationalChart = dynamic(
  () => import('@/src/modules/metrics/presentation/components/OperationalChart'),
  { loading: () => <div className="h-72 bg-white animate-pulse rounded-xl" /> }
);

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-sm text-gray-500">Real-time financial ratios and daily operational metrics</p>
        </div>
      </header>

      {/* Renders Food Cost %, Contribution Margin, Break-Even, CAC, LTV */}
      <MetricCardsGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renders Financial trends */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Financial Ratios</h3>
          <DynamicFinancialChart />
        </div>

        {/* Renders Operational (Waste, ticket average/time, occupancy) metrics */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Daily Operations</h3>
          <DynamicOperationalChart />
        </div>
      </div>
    </section>
  );
}
```

### 5.2 Orders Control Panel (`app/(app)/orders/page.tsx`)
Integrates active order grids, table monitoring, and shopping cart operations.

```tsx
// app/(app)/orders/page.tsx (Client Component)
'use client';

import ActiveTablesGrid from '@/src/modules/orders/presentation/components/ActiveTablesGrid';
import CartSheet from '@/src/modules/orders/presentation/components/CartSheet';

export default function OrdersPage() {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <header>
          <h2 className="text-2xl font-bold tracking-tight">Active Diner Tables</h2>
          <p className="text-sm text-gray-500">Monitor active orders, ticket times, and table status</p>
        </header>

        {/* Grid illustrating dining tables layout */}
        <ActiveTablesGrid />
      </div>

      {/* CartSheet: Side pane taking order items (meat, pork, chicken, sides) */}
      <aside className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
        <CartSheet />
      </aside>
    </section>
  );
}
```

---

## 6. AI Agent Guidelines for Routing Execution
When modifying or extending views:
1.  **Keep UI Free of State Mutators**: Component files under `app/` should ONLY act as view containers and call React hooks (`@/src/modules/*/presentation/hooks/...`). They must never invoke the database client or mutate state directly.
2.  **Explicit Route Groups**: Always place routes within `(auth)` or `(app)` directories to ensure layouts and navigation guards are inherited correctly.
3.  **Loading & Error States**: Create adjacent `loading.tsx` and `error.tsx` files for any resource-heavy pages (such as dashboard and orders) to leverage Next.js native streaming and suspense error boundaries.
4.  **Enforce Strict English**: Folder names, route segments, variables, props, files, and inline comments must be strictly in English.
