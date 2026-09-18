# Metrics — asadero-pro

Financial and operational formulas for the dashboard. Source: `.cursor/rules/04-dashboard.md`.

Query adapters for these metrics live in `src/domains/metrics/infrastructure/`. Presentation must not call `createClient()`.

## Financial

### Food Cost %

`(Ingredient cost from order deductions + logged operational waste cost) / Net sales × 100`

Target: **30.0% to 35.0%** (merchant `target_food_cost_pct`, default 33%). Use inventory unit costs so meat price spikes show up immediately.

### Contribution margin (per portion)

`MenuItem Price - Total Variable Ingredients Cost`

High-margin plates (e.g. arrachera) should be easy to spot on the dashboard.

### Break-even point (BEP)

- Revenue: `Fixed Overhead Costs / Contribution Margin Ratio`
- Portions: `Fixed Overhead Costs / Average Contribution Margin per Portion`

Fixed overhead includes rent, salary, utilities (`merchants.monthly_fixed_overhead`).

### CAC / LTV

Documented for future marketing/customer features; **not implemented** on the MVP dashboard.

## Operational

### Waste %

`(Total Weight of Discarded Meat (kg) / Total Weight of Purchased Meat (kg)) * 100`

Target: **< 5.0%**. Reasons: `burned_on_grill`, `fat_discarded`, `spoiled_raw`, `customer_return`.

### Average ticket

`Net sales / Completed orders in period`

### Ticket time (minutes)

`(ready_at − sent_to_kitchen_at)` for kitchen queue orders (median and P90 on dashboard).

### Table turnover

`Sessions completed in period / seating table count / days in period`

### Occupancy %

`(Tables occupied in interval / Total tables available) * 100`

## UI performance

Load chart widgets with `next/dynamic` and a skeleton fallback (`docs/conventions.md`). Default query `staleTime`: 60 seconds; `refetchOnWindowFocus`: false (from the dashboard rule), unless a spec overrides.
