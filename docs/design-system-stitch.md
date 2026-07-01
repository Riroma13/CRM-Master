---
name: Mission Control
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
  success: '#10B981'
  warning: '#F59E0B'
  critical: '#EF4444'
  surface-glass: rgba(255, 255, 255, 0.7)
  border-subtle: '#E2E8F0'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max-width: 1440px
  gutter: 1.5rem
  sidebar-width: 260px
  tight-gap: 0.5rem
  standard-padding: 1rem
  section-margin: 2rem
---

# Design System — Mission Control

> Diseño exportado de Google Stitch para el panel de supervisión CRM-Master
> Versión: 1.0 — Julio 2026

## Brand & Style

The brand personality is authoritative, precise, and highly dependable—functioning as a "Second Brain" for complex system management. It avoids the fluff of consumer CRMs in favor of a high-density, professional "Mission Control" environment that prioritizes situational awareness and rapid decision-making.

The design style is **Corporate / Modern** with a strong emphasis on **Minimalism** and **Data Density**. It utilizes a "Management Layer" aesthetic characterized by:
- **Clarity over Decoration:** Every UI element serves a functional purpose, using white space to group related data points without wasting screen real estate.
- **Sophisticated Elevation:** Subtle glassmorphism effects and layered surfaces differentiate the meta-management layer from the underlying data.
- **High-Trust Visuals:** A sober color palette paired with precise geometry to evoke a sense of stability and technical mastery.
- **Systematic Logic:** A rigid adherence to grid structures to facilitate the scanning of large tables and complex timelines.

## Colors

The palette is anchored by **Deep Corporate Slate** (`#0F172A`) for primary branding and headers, providing a "command center" feel. The interface primarily uses a light mode execution to ensure maximum readability for dense data sets.

- **Primary:** Deep Slate for text, primary navigation, and high-emphasis actions.
- **Secondary:** Cool Grays for sub-navigation, secondary icons, and metadata.
- **Status Accents:** A strict semantic system for health monitoring:
  - **Success (Emerald):** Indicates operational systems and healthy client relationships.
  - **Warning (Amber):** Highlights systems with incidents or clients requiring attention.
  - **Critical (Rose):** Flags system outages or high-priority relationship risks.
- **Neutral:** Multi-tiered grays used for background layering and subtle borders to maintain a clean, structured appearance.

## Typography

This design system utilizes **Inter** for all primary UI roles due to its exceptional legibility at small sizes and high-density layouts.

- **Hierarchical Contrast:** Use weight (SemiBold/Bold) rather than just size to denote hierarchy, keeping the overall font sizes relatively small to maintain high data density.
- **Data Clarity:** For technical details like UUIDs, URL endpoints, or commit hashes, use a secondary monospaced font (**JetBrains Mono**) at a slightly reduced size to distinguish system data from human-readable content.
- **Labels:** Use uppercase labels with increased letter spacing for table headers and section categorizations to create a distinct visual "anchor" for data groups.

## Layout & Spacing

The design system uses a **Fixed Grid** philosophy for the main content area to ensure data doesn't become unreadable on ultra-wide monitors, paired with a fluid sidebar for navigation.

- **Sidebar:** A persistent 260px left-hand navigation allows for quick switching between the Dashboard, Global Inventory, and Bitácora.
- **Density:** Spacing is tighter than a standard SaaS app (8px / 0.5rem base unit) to allow for more rows in tables and more cards on the "Map of Clients."
- **Grid:** A 12-column grid is used within the main content area. On **Desktop**, the "Map of Clients" should display in a 3-column or 4-column layout. On **Tablet**, this reflows to 2 columns. **Mobile** uses a single-column stack with 16px horizontal margins.
- **Safe Areas:** Maintain a minimum 24px padding around the main content container to provide breathing room against the sidebar and screen edges.

## Elevation & Depth

Visual hierarchy is conveyed through **Tonal Layers** and **Low-Contrast Outlines**, creating a sophisticated "stacked" look.

- **Background:** The base layer is a very light neutral gray (`#F8FAFC`).
- **Cards:** Main content cards use a pure white background with a thin `1px` border (`#E2E8F0`).
- **The "Glass" Effect:** For elevated panels—such as the "Quick Action" slide-overs or the Detail View headers—apply a backdrop-filter blur (8px) with a semi-transparent white background (`rgba(255, 255, 255, 0.7)`).
- **Shadows:** Avoid heavy, dark shadows. Use a single "Ambient Shadow": `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)`. This makes cards appear to hover slightly above the surface without creating visual clutter.

## Shapes

The shape language is **Soft (Level 1)**, leaning toward a professional, geometric feel.

- **UI Elements:** Buttons, input fields, and small chips use a `0.25rem` (4px) corner radius. This maintains a "technical" look while avoiding the harshness of sharp corners.
- **Containers:** Large cards and the sidebar use `0.5rem` (8px) or `0.75rem` (12px) to softly frame the dense data within.
- **Status Indicators:** Health dots should remain perfect circles, but status "pills" (e.g., tags) use the `0.25rem` radius to match the systematic aesthetic.

## Components

- **Health Status Dots:** Small 8px circles using the `Success`, `Warning`, and `Critical` colors. Used next to client names and system titles.
- **Data Tables:** High-density rows with 12px vertical padding. Use alternating row stripes using a subtle gray (`#F1F5F9`) for long inventory lists.
- **Cards:** Use a white background, subtle border, and the ambient shadow. Header sections within cards should have a light gray bottom border.
- **Buttons:**
  - *Primary:* Solid Deep Slate (`#0F172A`) with white text.
  - *Secondary:* White background with a `#E2E8F0` border and Slate text.
- **Chips/Tags:** Small, low-contrast backgrounds (e.g., Light Slate for general tags, light green for "Active" status) with bold, small-caps text.
- **Timeline (Bitácora):** A vertical line component with small nodes. Use icons within the nodes to distinguish between "Technical Change," "Decision," and "Incident."
- **Inputs:** Clean, 1px bordered boxes. On focus, use a subtle 2px glow of the primary color with 20% opacity.
- **Global Inventory Matrix:** A specialized table component where columns represent functionalities and rows represent clients, using icons to show "Implemented," "Partial," or "Planned."
