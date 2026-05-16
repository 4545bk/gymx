---
name: GymX Management Interface
colors:
  surface: '#141218'
  surface-dim: '#141218'
  surface-bright: '#3b383e'
  surface-container-lowest: '#0f0d13'
  surface-container-low: '#1d1b20'
  surface-container: '#211f24'
  surface-container-high: '#2b292f'
  surface-container-highest: '#36343a'
  on-surface: '#e6e0e9'
  on-surface-variant: '#cbc4d2'
  inverse-surface: '#e6e0e9'
  inverse-on-surface: '#322f35'
  outline: '#948e9c'
  outline-variant: '#494551'
  surface-tint: '#cfbcff'
  primary: '#cfbcff'
  on-primary: '#381e72'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#6750a4'
  secondary: '#cdc0e9'
  on-secondary: '#342b4b'
  secondary-container: '#4d4465'
  on-secondary-container: '#bfb2da'
  tertiary: '#e7c365'
  on-tertiary: '#3e2e00'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#141218'
  on-background: '#e6e0e9'
  surface-variant: '#36343a'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for an ultra-premium, high-performance gym management environment. It targets gym owners and fitness professionals who require a high-density, data-rich interface that feels like a piece of precision machinery. 

The aesthetic is **Corporate Modern** with a **Glassmorphism** edge. It utilizes deep, layered surfaces to create a sense of focus and hierarchy, evoking a high-end "command center" feel. The emotional response is one of reliability, elite status, and technological sophistication. Visual interest is driven by sharp typography and high-energy cyan-to-blue gradients that cut through the dark, immersive background.

## Colors
This design system utilizes a "Deep Tech" dark mode. The primary background is a near-black navy to reduce eye strain during long administrative sessions. Surfaces use a slightly lighter navy to indicate elevation. 

The accent gradient is reserved for high-priority actions and state-of-health indicators (e.g., active membership counts, revenue peaks). Use the feedback colors sparingly to ensure they maintain their communicative power against the dark backdrop.

## Typography
The system relies exclusively on **Inter** to maintain a systematic, utilitarian, and modern feel. Headlines use tight tracking and heavy weights to project authority and strength. 

Body text should maintain a high contrast against the background (using 90% opacity white) to ensure legibility. Labels and metadata should use uppercase styling with increased letter spacing to distinguish them from interactive content.

## Layout & Spacing
The design system follows a **Fixed Grid** model for the main dashboard content, centered within a 1440px container, while the sidebar navigation remains fixed to the viewport edge. 

A strict 8px scaling system is used for all internal component spacing. For complex data tables or member rosters, the spacing may collapse to a 4px "Compact" rhythm. On mobile devices, margins reduce to 16px, and multi-column card layouts reflow into a single vertical stack.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Ambient Shadows**. 
1. **Level 0 (Base):** `#0a0e1a` - Used for the main background canvas.
2. **Level 1 (Card):** `#1a1f35` - Used for primary content containers. Features a `1px` solid border of `#1e293b`.
3. **Level 2 (Dropdown/Modal):** `#242b45` - Used for elements sitting above the card layer.

Shadows are deep and soft: `0 8px 30px rgba(0,0,0,0.5)`. Interactive primary elements (like active buttons) should feature a subtle outer glow using the cyan accent color with a high blur and low (15-20%) opacity.

## Shapes
The shape language balances approachability with professional structure. Large containers like dashboard cards and member profiles use a `20px` radius (`rounded-xl`). Smaller interactive components like buttons, input fields, and tags use a `10px` radius to feel precise and clickable.

## Components
- **Buttons:** Primary buttons use the accent gradient with white text. Secondary buttons are "Ghost" style with the `#1e293b` border and a subtle hover fill.
- **Input Fields:** Use the surface color `#1a1f35` with a `#1e293b` border. On focus, the border transitions to the Cyan accent.
- **Cards:** Must include the 20px corner radius and the deep shadow. Headers within cards should have a subtle bottom border to separate titles from content.
- **Status Chips:** Use a low-opacity version of the feedback colors (e.g., 10% Success Green) for the background, with the full-saturation color for the text and a small leading icon.
- **Data Tables:** Use alternating row highlights (Zebra striping) with the surface color and base background color. Headers should be sticky and use the `label-sm` typography style.
- **Sidebar:** A vertical navigation bar with a glassmorphism effect (blur: 20px) and a subtle right-side border.