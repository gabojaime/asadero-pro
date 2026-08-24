# Design System Specification (design.md)
## Google Labs DESIGN.md Open Specification Format

This document serves as the machine-readable design token registry and visual guidelines for the **Asadero Management System (AMS)**. It is optimized for AI coding agents (such as Cursor, GitHub Copilot, and Claude) to build consistent, high-fidelity user interfaces utilizing **shadcn/ui** and **Tailwind CSS**.

---

## 1. System Metadata
- **System Name**: Asadero Management System (AMS)
- **Design Philosophy**: "Invisible UI" — The interface recedes completely so that raw meat weights, cooking metrics, financial figures, and active orders remain the absolute heroes of the screen.
- **Reference Standard**: Inspired by Apple's low-density, photography-first, single-accent design system.
- **Component Primitive Library**: shadcn/ui (Tailwind CSS)
- **Language**: English (Optimized for LLM token efficiency and agent precision)

---

## 2. Design Tokens

### A. Color Tokens (21 Tokens)
Following a single-accent interactive color system, we use **Flame Red** as our singular interactive focal color (replacing Apple's Action Blue) to represent heat, fire, and urgency, while surfaces use organic, high-contrast meat-aging/ash tones.

```json
{
  "color": {
    "brand": {
      "primary": { "value": "#e11d48", "description": "Flame Red: The single interactive color. Every primary button, link, active focus indicator, and critical action." },
      "primary_hover": { "value": "#be123c", "description": "Deep Flame: Hover and active state for primary actions." },
      "primary_translucent": { "value": "rgba(225, 29, 72, 0.1)", "description": "Subtle red highlight for soft selections or warning containers." }
    },
    "surface": {
      "canvas": { "value": "#fafafa", "description": "Parchment White: Default page background for light mode." },
      "canvas_dark": { "value": "#09090b", "description": "Charcoal Black: Default page background for dark mode." },
      "card_pearl": { "value": "#ffffff", "description": "Pure Pearl: Standard card background in light mode." },
      "card_tile_1": { "value": "#18181b", "description": "Zinc Tile: Primary dark-mode card background." },
      "card_tile_2": { "value": "#27272a", "description": "Coal Tile: Secondary dark-mode card background for nested containers." },
      "card_tile_3": { "value": "#3f3f46", "description": "Ash Tile: Tertiary dark-mode card background for disabled or muted states." },
      "translucent_overlay": { "value": "rgba(0, 0, 0, 0.4)", "description": "Smoke Overlay: Translucent background for dialogs and sheets." }
    },
    "text": {
      "ink": { "value": "#09090b", "description": "Steak Ink: Deepest black for primary titles and high-priority labels in light mode." },
      "ink_dark": { "value": "#f4f4f5", "description": "Ash White: Cleanest white for titles and primary labels in dark mode." },
      "body": { "value": "#27272a", "description": "Default readable body text for light mode." },
      "body_dark": { "value": "#e4e4e7", "description": "Default readable body text for dark mode." },
      "muted": { "value": "#71717a", "description": "Medium zinc gray for secondary details, metadata, and placeholder text." },
      "muted_dark": { "value": "#a1a1aa", "description": "Light zinc gray for secondary details in dark mode." },
      "on_primary": { "value": "#ffffff", "description": "White text used directly on top of primary Flame Red containers." }
    },
    "border": {
      "divider_soft": { "value": "#f4f4f5", "description": "Super soft border for light-mode dividing lines." },
      "divider_dark": { "value": "#27272a", "description": "Super soft border for dark-mode dividing lines." },
      "hairline": { "value": "#e4e4e7", "description": "Ultra-thin outline border for cards and input fields in light mode." },
      "hairline_dark": { "value": "#3f3f46", "description": "Ultra-thin outline border for cards and input fields in dark mode." }
    }
  }
}
```

### B. Typography Tokens (16 Tokens)
AMS utilizes the **SF Pro** family (falling back to standard system sans-serif if unavailable) to maintain a premium, compact, display-oriented cadence.
- **Font-Weight Rule**: Weight `500` (Medium) is strictly **absent** from the system. The scale runs 300 (Light), 400 (Regular), 600 (Semibold), and 700 (Bold) to create crisp, high-contrast layouts.
- **Letter-Spacing Rule**: High-density display headings carry negative letter-spacing for that tight, modern Apple cadence.

```json
{
  "typography": {
    "families": {
      "display": { "value": "SF Pro Display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
      "text": { "value": "SF Pro Text, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
    },
    "sizes": {
      "hero_title": { "size": "44px", "line_height": "48px", "weight": "700", "tracking": "-0.022em", "family": "display" },
      "section_title": { "size": "28px", "line_height": "32px", "weight": "600", "tracking": "-0.015em", "family": "display" },
      "card_title": { "size": "20px", "line_height": "24px", "weight": "600", "tracking": "-0.007em", "family": "display" },
      "body_large": { "size": "17px", "line_height": "24px", "weight": "400", "tracking": "0.000em", "family": "text" },
      "body_regular": { "size": "15px", "line_height": "20px", "weight": "400", "tracking": "0.004em", "family": "text" },
      "ui_label": { "size": "13px", "line_height": "16px", "weight": "600", "tracking": "0.010em", "family": "text" },
      "caption": { "size": "11px", "line_height": "14px", "weight": "400", "tracking": "0.015em", "family": "text" }
    }
  }
}
```

### C. Radius & Shape Tokens (7 Tokens)
Avoids "neobrutalism" or extreme rounded corners. Uses a structured hierarchy where interactive components are rounded but page structures bleed.

```json
{
  "shape": {
    "border_radius": {
      "full_bleed": { "value": "0px", "description": "Used for page-wide banners, absolute-bottom mobile bars, or raw table rows." },
      "card": { "value": "12px", "description": "Default rounding for shadcn/ui Card components." },
      "input": { "value": "8px", "description": "Slightly tighter rounding for inputs, dropdown selections, and textareas." },
      "button": { "value": "6px", "description": "Strict, clean rounding for clickable UI buttons." },
      "badge": { "value": "9999px", "description": "Pill shape reserved for state indicators and counter tags." }
    }
  }
}
```

---

## 3. shadcn/ui Primitive Overrides & Tailwind Mapping

To enforce these tokens in the React application, configure the Tailwind CSS theme config as follows:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)", // Flame Red #e11d48
          foreground: "var(--primary-foreground)", // White #ffffff
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "12px", // Card radius
        md: "8px",  // Input radius
        sm: "6px",  // Button radius
      },
      fontFamily: {
        sans: ["SF Pro Text", "-apple-system", "sans-serif"],
        display: ["SF Pro Display", "-apple-system", "sans-serif"],
      },
    },
  },
};
```

---

## 4. Key Component Definitions & Visual Rules

### Component 1: Metric Tile (The Metric Card)
Used in the analytics dashboard to display financial and operational indicators (e.g., Food Cost %, Waste %).
*   **Structure**: A flat card styled with `surface_pearl` (light mode) or `card_tile_1` (dark mode) and a 1px border. No drop shadow.
*   **Spacing**: 24px padding on all sides (`p-6`).
*   **Layout**:
    *   Top: Muted metric label in `ui_label` text token.
    *   Center: Large, bold numeric value in `hero_title` (or `section_title` if value is long) in `ink`.
    *   Bottom: Trend indicator or safety threshold marker in `caption`.
        *   *Example*: If Food Cost is within 30%-35% threshold, show green indicator. If it exceeds 35% due to meat inflation, highlight with `brand.primary` (Flame Red) text.

### Component 2: Raw Material Waste Input Row
High-density inputs for parrillero staff to report meat loss.
*   **Structure**: Inline row format within a table or flat list.
*   **Layout**:
    *   Left: Material label (e.g., "Beef Arrachera") in `body_regular` (Bold 600 weight).
    *   Center-Left: Weight input field formatted with a trailing unit indicator ("kg") aligned right.
    *   Center-Right: Reason dropdown selection (e.g., "Overcooked", "Excess Fat").
    *   Right: Inline submit button styled with `shape.border_radius.button` and `brand.primary` background.

### Component 3: Live Order Queue Item
Used by grill masters to see active tickets.
*   **Structure**: Horizontal high-contrast banner with alternating canvas colors to separate items.
*   **Layout**:
    *   Left-most: Large desk/table session identifier (e.g., "Table 04") inside a `brand.primary_translucent` pill badge.
    *   Center: Structured bullet list of items and portions (e.g., "1x Arrachera 300g (Medium-Well)", "2x Pork Ribs 400g").
    *   Right: Preparation Timer (dynamic coloring: turns Flame Red if prep time exceeds the target "Ticket Time" parameter).

---

## 5. Prohibited Visual Antipatrons (Do Not Program)
1.  **Multiple Accent Colors**: Do NOT introduce secondary brand colors (like purple, orange, or emerald green) for standard actions. Every active interactive element (focus state, checked checkbox, radio button) is strictly Flame Red (`#e11d48`).
2.  **Card Shadows**: Do NOT use deep box shadows (`shadow-lg`, `shadow-2xl`) on interface panels. Surfaces must be perfectly flat, defined solely by high-contrast canvas switches (`canvas parchment` vs. `surface pearl`) and crisp 1px borders (`hairline`).
3.  **Ambiguous States**: Do NOT display raw numbers without their relevant units or target thresholds (always explicitly show "kg", "grams", or "%" targets to help the AI maintain data integrity).
