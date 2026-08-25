# MVP Functional Specification: Asadero Pro

This specification establishes the detailed backlog of features required to complete the Minimum Viable Product (MVP) of **Asadero Pro**, a multi-tenant business management SaaS tailored specifically for charcoal-grilled meat operations (beef, pork, and chicken).

To optimize LLM token costs and ensure absolute clarity for AI agents (such as Cursor and Copilot), all database schemas, code modules, and developer comments are strictly standardized in **English**, while the business requirements are presented below in a highly descriptive Spanish specification format.

---

## 🗺️ MVP Backlog Map & Detailed Features

### 1. Merchant Onboarding & User Registration
**Core Concept:** The entry point where a business (merchant) creates its digital space and registers its first administrator user.

*   **1.1. Tenant (Merchant) Creation:**
    *   **User Action:** A business owner lands on the onboarding screen and inputs the business legal name, public name, address, tax configuration parameters, and contact phone number.
    *   **AI Agent Context (Database):** Insert a record into the `merchants` table [166]. This generates a UUID `merchant_id` which acts as the multi-tenant partitioning key for all future transactions, guaranteeing strict data isolation through Postgres RLS (Row Level Security) [168, 224].
    *   **Validation:** Legal name cannot be empty.
*   **1.2. Root Admin User Registration:**
    *   **User Action:** Directly linked to the merchant creation step, the owner inputs their full name, professional email, and password.
    *   **AI Agent Context (Database):** Register the credentials in Supabase Auth (which secures password hashing and cookie session persistence automatically) [167, 226]. On success, create a profile record in the `users` table mapped to the generated auth UID, with `role` explicitly set to `'admin'` and linked to the `merchant_id`.
*   **1.3. UI / UX Design Standards:**
    *   Designed under the **"Invisible UI"** philosophy: clear white/parchment backgrounds (`canvas #ffffff` or `canvas parchment #f5f5f7`) with a single crisp focus on the registration cards [1, 6].
    *   Interactive elements must strictly use the single active **Flame Red (#e11d48)** accent for primary buttons and focus states, with typography set to `SF Pro Text` using weights `300`/`400` for helper labels and `600`/`700` for titles (weight `500` is completely absent from the system layout) [2, 4, 6].

---

### 2. Multi-Tenant Authentication & Session Safeguards
**Core Concept:** Secure access barrier protecting the private dashboard, identifying the active tenant and routing users based on their assigned roles.

*   **2.1. User Sign-In (Login):**
    *   **User Action:** User enters email and password on the login screen.
    *   **AI Agent Context (Infrastructure):** Execute Supabase Auth sign-in [168]. Next.js Middleware intercepts the request, reads the session cookie, fetches the corresponding profile from `users`, and loads the active `merchant_id` into client memory using a global secure context wrapper [116].
*   **2.2. Role-Based Route Guarding (RBAC):**
    *   **System Action:** When navigating, Next.js App Router route groups protect pages [116, 120]:
        *   `app/(auth)/*`: Public routes for signup, sign-in, and recovery.
        *   `app/(app)/*`: Private protected routes.
    *   **Authorization Rules:**
        *   `admin`: Full access to database configurations, analytical metrics, raw materials cost tracking, and sales logs.
        *   `grillmaster` (parrillero): Restrained access. Automatically redirected to the kitchen active queue view (`app/(app)/kitchen`). Blocked from accessing financial dashboard views.
        *   `waiter` (mesero): Access to active order tables, cart configuration, and order entry views (`app/(app)/orders`).
*   **2.3. Row-Level Security (RLS) Enforcement:**
    *   Every database query executed through Client or Server Components must validate that the row matches the authenticated user's `merchant_id` [166, 168].

---

### 3. Raw Materials Inventory Management (Insumos CRUD)
**Core Concept:** Cataloging and monitoring the raw, uncooked ingredients (meats, poultry, pork, charcoal, spices) bought in bulk.

*   **3.1. Inventory Cataloging (Item Creation):**
    *   **User Action:** The Admin registers a raw material, specifying the name (e.g., "Raw Arrachera", "Pork Ribs", "Whole Chicken"), unit of measurement (standardized as **Kilograms** with 3 decimal places to support precise gram measurements, e.g., 0.350 kg for a steak portion), and purchase cost per unit (e.g., $15.50 per kg).
    *   **AI Agent Context (Database):** Write to `raw_materials_inventory` table.
*   **3.2. Stock Adjustment & Receiving (Inward Movements):**
    *   **User Action:** When a new shipment arrives from the supplier, the Admin enters the quantity added in kilograms.
    *   **System Action:** The system updates the `current_stock_kg` by adding the incoming quantity, and calculates an updated weighted average cost (WAC) to adjust future financial metrics automatically.
*   **3.3. Clean Code Guardrails (SOLID):**
    *   Ensure strict application of the **Single Responsibility Principle (SRP)** [79]: Separation of concerns between database mutation functions (infrastructure layer) and calculations like WAC adjustments (domain service layer) [12, 19, 20]. All variables must be descriptive (e.g., `updateWeightedAverageCost` instead of `updWAC`) [39].

---

### 4. Hexagonal Order & Table Queue Management (Comandas)
**Core Concept:** Managing the dining room order flow from cart addition to active cooking tracking in the kitchen.

*   **4.1. Order & Cart Registry (Waiter Interface):**
    *   **User Action:** The waiter opens the order panel, selects a table ID, configures a cart of menu items (e.g., "Plato de Arrachera 300g" x2, "Family Combo" x1), and clicks "Send to Kitchen".
    *   **Functional Programming Implementation (Clean Code):** Accidental state mutation must be strictly prevented [55]. Cart updates are handled through pure, immutable functions in TypeScript (e.g., cloning the state array using the spread operator instead of pushing to a mutable variable) [60]:
        ```typescript
        // Always return a brand new copy of the shopping cart
        export const addMenuItemToCart = (cart: CartItem[], item: MenuItem): CartItem[] => {
          const existingIndex = cart.findIndex(c => c.menuItemId === item.id);
          if (existingIndex !== -1) {
            return cart.map((c, idx) => idx === existingIndex ? { ...c, quantity: c.quantity + 1 } : c);
          }
          return [...cart, { menuItemId: item.id, quantity: 1, unitPrice: item.price }];
        };
        ```
*   **4.2. Kitchen Queue & Order Dispatch (Grillmaster Interface):**
    *   **User Action:** The grillmaster sees a column of incoming orders ordered by chronological timestamp. As they finish grilling the meats, they click "Mark as Ready".
    *   **AI Agent Context (TanStack Query):** The kitchen view consumes `useQuery(['active-orders', merchantId])` to pull active orders dynamically [20]. Marking an order as ready triggers a `useMutation`, which internally executes the database update on `orders` and fires `queryClient.invalidateQueries(['active-orders'])` to achieve instantaneous reactiveness in the UI without browser page reloads [20].
*   **4.3. Real-Time Dynamic Rendering & Performance:**
    *   The orders page uses Next.js Streaming with `<Suspense>` and dynamic imports (`next/dynamic`) to stream order items progressively, keeping the interface completely responsive under peak weekend sales volumes [118, 135].

---

### 5. Automated Cooking Waste (Merma) and Cost Calculator
**Core Concept:** Tracking physical weight loss during prep and cooking to determine real profit margins and advise on optimal retail pricing.

*   **5.1. Prep and Grill Waste Logging (Registro de Mermas):**
    *   **User Action:** A parrillero records meat discarded due to trimming excess fat or being overcooked on the grill. They specify the raw material ID, the weight lost in kilograms, and select a standardized reason (e.g., `'overcooked'`, `'excess_fat'`, `'spoiled'`).
    *   **AI Agent Context (Database):** Create an immutable record in `waste_logs` [20].
*   **5.2. Automated Ingredient Deduction on Order Checkout:**
    *   **System Action:** When an order is completed, the system reads the recipe configuration (`recipe_ingredients` table mapping a menu item to its raw materials in kilograms) [17]. It automatically subtracts the required raw weight from `raw_materials_inventory.current_stock_kg`.
*   **5.3. Yield, Real Cost & Optimal Pricing Logic (Domain Service):**
    *   To keep the business profitable, the system encapsulates the math within the domain layer as pure service functions, separating calculation from DB triggers [12, 19]:
        *   **Yield Percentage Calculation:**
            $$\text{Yield \%} = \left(\frac{\text{Cooked Weight (kg)}}{\text{Raw Weight (kg)}}\right) \times 100$$
        *   **Real Cost Calculation (accounting for shrinkage):**
            $$\text{Real Cost of Material} = \frac{\text{Purchase Cost per kg}}{\text{Yield \%} / 100}$$
        *   **Optimal Selling Price Recommendation:**
            $$\text{Optimal Retail Price} = \frac{\text{Sum of Ingredients Real Cost}}{\text{Targeted Food Cost \% (e.g., 0.33)}}$$
        *   *Clean Code Rule:* Encapsulate these formulas inside clear, readable domain functions (e.g., `calculateOptimalRetailPrice(recipeIngredients, targetFoodCostPct)`) with zero side effects [54, 56].

---

### 6. High-Fidelity Metrics & Analytics Dashboard
**Core Concept:** A visual command center showing the financial and operational health of the asadero, optimized for administrators.

*   **6.1. Financial Analytics Section:**
    *   **Food Cost Percentage (Food Cost %):**
        *   *Calculation:* $\frac{\text{Total cost of raw materials consumed + logged waste}}{\text{Total net sales revenue}} \times 100$
        *   *Business Logic:* The dashboard triggers an immediate alert (Flame Red styling) if this metric exceeds the critical **30% to 35%** threshold due to wholesale meat price inflation.
    *   **Contribution Margin:** Represents net revenue after subtracting variable costs. Displays a list comparing cuts (e.g., Arrachera vs. Pork Ribs) to show which item pays for fixed costs more efficiently.
    *   **Break-Even Point (Punto de Equilibrio):** Number of beef portions or sales dollar volume required monthly to cover base operational costs (rent, payroll, utilities).
    *   **Customer Acquisition Cost (CAC) & Lifetime Value (LTV):** Measures marketing spend efficiency on delivery apps vs. repeating weekend diners.
*   **6.2. Operational Day-to-Day Metrics Section:**
    *   **Waste Percentage (Waste %):** Percentage of raw meat lost to avoidable errors (aims for **< 5%**).
    *   **Average Ticket (Ticket Promedio):** Revenue divided by total transactions.
    *   **Ticket Time (Tiempo de Servicio):** Time from waiter click to "Mark as Ready" in minutes. High times flag a bottleneck in the grill, causing dry, overcooked meat.
    *   **Table Turnover & Occupancy Percentage:** Tracking active seating sessions to identify dead hours (enabling promotions for Tuesdays/Wednesdays).
*   **6.3. Advanced Dashboard UI Architecture:**
    *   The complex mathematical aggregations are executed securely on the server via Next.js Server Components, fetching raw records directly [116].
    *   The charts are rendered client-side using a modern React graphing library loaded lazily with `next/dynamic`, avoiding any bundle size bloat and ensuring a lightning-fast Initial Page Load [135, 136].
