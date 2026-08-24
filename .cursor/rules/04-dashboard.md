# Metrics Dashboard & Data Fetching (metrics-dashboard.md)

This specification defines the metrics definitions, mathematical formulas, and TanStack React Query patterns for the BBQ interactive dashboard.

---

## 1. FINANCIAL METRICS FORMULAS & TARGETS

### Food Cost Percentage (Food Cost %)
- **Formula**:
  $$\text{Food Cost \%} = \left( \frac{\text{Total Cost of Ingredients Used}}{\text{Total Sales}} \right) \times 100$$
- **Target**: **30.0% to 35.0%**
- **Critical Dynamics**: In a BBQ restaurant, raw meat prices fluctuate frequently. AI agents must implement real-time cost tracking using historical inventory price entries to immediately reflect raw materials cost spikes in this percentage.

### Contribution Margin (per portion)
- **Formula**:
  $$\text{Contribution Margin} = \text{MenuItem Price} - \text{Total Variable Ingredients Cost}$$
- **Target**: High margin items (such as prime steak cuts like arrachera) must be prioritized in menu layouts to absorb fixed restaurant overheads.

### Break-Even Point (BEP)
- **Formula**:
  $$\text{BEP (Revenue)} = \frac{\text{Fixed Overhead Costs (Rent, Salary, Utilities)}}{\text{Contribution Margin Ratio}}$$
  $$\text{BEP (Portions)} = \frac{\text{Fixed Overhead Costs}}{\text{Average Contribution Margin per Portion}}$$
- **Operational Value**: Calculates the minimum daily/monthly sales volume required to keep the restaurant in a zero-loss state.

### Customer Acquisition Cost (CAC)
- **Formula**:
  $$\text{CAC} = \frac{\text{Marketing Investment (Delivery App Ads, Social Media Ads)}}{\text{Number of New Customers Acquired}}$$
- **Context**: Crucial when factoring in delivery services commission cuts.

### Customer Lifetime Value (LTV)
- **Formula**:
  $$\text{LTV} = \text{Average Order Value} \times \text{Average Purchase Frequency} \times \text{Customer Lifespan (Months)} \times \text{Gross Margin \%}$$
- **BBQ Business Engine**: In BBQ restaurants, repeat weekend customers are the primary source of profitability, making LTV a critical indicator of long-term business health.

---

## 2. OPERATIONAL METRICS FORMULAS & TARGETS

### Waste Percentage (Waste %)
- **Formula**:
  $$\text{Waste \%} = \left( \frac{\text{Total Weight of Discarded Meat (kg)}}{\text{Total Weight of Purchased Meat (kg)}} \right) \times 100$$
- **Target**: **< 5.0%**
- **Context**: Minimizes losses from bad trimming, improper storage, or meat burned/overcooked on the grill.

### Average Ticket Size (Average Ticket)
- **Formula**:
  $$\text{Average Ticket} = \frac{\text{Total Session Sales}}{\text{Total Tables/Orders Completed}}$$
- **Value**: Tracks grill masters' or servers' effectiveness in upselling side dishes (avocado, beans, drinks, desserts).

### Preparation/Service Time (Ticket Time)
- **Formula**:
  $$\text{Ticket Time (Minutes)} = \text{Order Served Timestamp} - \text{Order Placed Timestamp}$$
- **Critical Quality Limit**: Meat begins drying out if left waiting. High Ticket Times directly degrade BBQ quality and slow down table rotations.

### Table Turnover Rate
- **Formula**:
  $$\text{Table Turnover} = \frac{\text{Total Table Sessions Completed}}{\text{Total Available Tables Count}}$$
- **Value**: Evaluates efficiency in cleaning and re-seating guests during peak hours.

### Occupancy Percentage (Occupancy %)
- **Formula**:
  $$\text{Occupancy \%} = \left( \frac{\text{Mesas Occupied during specific interval}}{\text{Total Tables Available}} \right) \times 100$$
- **Value**: Highlights slow hours (e.g., Tuesdays or Wednesdays) to prompt promotions.

---

## 3. CLIENT DATA FETCHING & STATE MUTATION (TanStack Query v5)

Use TanStack Query for dynamic client-side caching. Ensure query keys and mutation handlers are strictly written in English.

### React Query Setup (App Router)
Create a client-side wrapper to initialize and provide the query context:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute cache validity
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Fetching Operational and Financial States (`useQuery`)
```typescript
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useOrders(merchantId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['orders', merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
  });
}
```

### Saving Waste Logs with Auto-Invalidation (`useMutation`)
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface CreateWasteLogPayload {
  merchantId: string;
  rawMaterialId: string;
  weightKg: number;
  unitCost: number;
  reason: 'burned_on_grill' | 'fat_discarded' | 'spoiled_raw' | 'customer_return';
  loggedBy: string;
}

export function useLogWaste() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (payload: CreateWasteLogPayload) => {
      const totalCost = payload.weightKg * payload.unitCost;
      const { data, error } = await supabase
        .from('waste_logs')
        .insert([{
          merchant_id: payload.merchantId,
          raw_material_id: payload.rawMaterialId,
          weight_kg: payload.weightKg,
          unit_cost: payload.unitCost,
          total_cost: totalCost,
          reason: payload.reason,
          logged_by: payload.loggedBy
        }])
        .select();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to instantly refresh the metrics dashboard
      queryClient.invalidateQueries({ queryKey: ['waste_logs', variables.merchantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.merchantId] });
    },
  });
}
```

---

## 4. DYNAMIC PERFORMANCE OPTIMIZATION

To optimize Core Web Vitals and initial bundle loads, dynamic components (like the metrics charts and panels) must be loaded lazily:

```typescript
'use client';

import dynamic from 'next/dynamic';

// Heavy chart components loaded dynamically with loading skeleton fallback
const DynamicFinancialChart = dynamic(
  () => import('@/components/FinancialMetricsChart'),
  { 
    ssr: false, 
    loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded-lg" /> 
  }
);

const DynamicOperationalChart = dynamic(
  () => import('@/components/OperationalMetricsChart'),
  { 
    ssr: false, 
    loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded-lg" /> 
  }
);

export default function MetricsDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Financial Dashboard</h2>
        <DynamicFinancialChart />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">Operational Dashboard</h2>
        <DynamicOperationalChart />
      </div>
    </div>
  );
}
```
