/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Single accent color family — used for primary buttons, active tab,
        // focus rings. Nothing else in the app should introduce a second
        // brand hue. 600 is the exact ADC logo red (#e3141a), sampled
        // directly from the brand mark — verified 4.79:1 contrast as both
        // white-on-600 (buttons) and 600-on-white (links, active tab),
        // passing WCAG AA for text. Do not swap 600 for a different shade;
        // it's pinned to the real logo color, everything else is derived
        // from it for a consistent scale.
        accent: {
          50: "#fdeced",
          100: "#fbd5d6",
          200: "#f8afb1",
          300: "#f37c7f",
          400: "#ee4448",
          500: "#ec2a2f",
          600: "#e3141a", // primary accent — exact ADC brand red (buttons, borders — NOT for text on the new warm surfaces, see accent-700-text below)
          700: "#b61015",
          800: "#8d0c10",
          900: "#68090c",
        },
        // Corrected brand-red variant for use as TEXT on the new warm
        // off-white surfaces. accent-600 as text measured 4.33:1 against
        // the new surface tones (fails WCAG AA at 4.5:1); this darker
        // value measures 5.63:1. Use this for red text/links; keep
        // accent-600 for solid button fills and borders, where its
        // contrast against white text is unaffected by the surface change.
        "accent-text": "#C01827",
        // Status colors — only used inside StatusBadge, never elsewhere as
        // decoration. Kept a visually distinct red family from `accent` so
        // a "decommissioned" badge is never confused with a primary action.
        status: {
          neutral: "#6b7280", // in_stock
          success: "#15803d", // assigned
          warning: "#b45309", // in_repair
          danger: "#b91c1c", // decommissioned
        },
        // Surface tones — warm off-white palette (replacing the earlier
        // cool-gray set) so the app reads less like a stock admin
        // dashboard template and more like a considered internal tool.
        // Still subtle tonal separation between page background, resting
        // cards, and sunken/hover states — just warmer.
        surface: {
          page: "#F7F4EF", // app background
          DEFAULT: "#FFFDF9", // card / modal / input surface
          sunken: "#F1EDE4", // table header row, hover states, wells
          border: "#e5e7eb", // hairline borders on top of surface tones (unchanged — still reads fine against the warm tones)
        },
        // Muted text color for meta/secondary copy (IDs, timestamps,
        // helper text) on the new warm surfaces. The generic gray-500
        // Tailwind default measured only 2.80:1 here — well under WCAG AA.
        // This warmer, darker value measures 5.22:1.
        muted: "#6F6555",
      },
      borderRadius: {
        app: "0.5rem", // 8px — the one radius value used on cards, buttons, inputs, modals
      },
      // Layered, soft shadows (two stacked shadows: a tight low-opacity one
      // plus a broader ambient one) instead of a single flat drop-shadow —
      // gives cards actual depth rather than reading as a bordered div.
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        cardHover:
          "0 2px 4px -1px rgb(16 24 40 / 0.05), 0 4px 8px -2px rgb(16 24 40 / 0.08)",
        modal:
          "0 4px 6px -2px rgb(16 24 40 / 0.05), 0 12px 24px -4px rgb(16 24 40 / 0.14)",
      },
      fontSize: {
        // Type scale: title / heading / body / meta. `title` sits above
        // `heading` so a page-level header ("Assets", "Products") visibly
        // outranks a modal's header — previously both used `heading` and
        // had no hierarchy between "main content" and "dialog on top of
        // it." Still a restricted, deliberate scale — no ad-hoc sizes.
        title: [
          "1.5rem",
          { lineHeight: "2rem", fontWeight: "700", letterSpacing: "-0.01em" },
        ], // 24px — page-level headers only
        heading: [
          "1.25rem",
          {
            lineHeight: "1.75rem",
            fontWeight: "600",
            letterSpacing: "-0.006em",
          },
        ], // 20px — modal/section headers
        body: ["0.9375rem", { lineHeight: "1.375rem", fontWeight: "400" }], // 15px
        meta: ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "400" }], // 13px
      },
    },
  },
  plugins: [],
};
