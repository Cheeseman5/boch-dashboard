# BOCH API Dashboard

A real-time system health monitoring dashboard integrated with the BOCH API via RapidAPI. Features a professional, high-density interface with dark and light theme support.

![Dashboard Preview](src/assets/logo.png)

---

## Quick Setup

### Prerequisites
- Node.js 18+ (or Bun)
- A valid RapidAPI key with BOCH API access

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

### First Run

1. Launch the dashboard
2. Click the **key icon** in the top navigation bar
3. Enter your `X-RapidApi-Key` or `X-RapidApi-User` key
4. Click **Connect** to load your watches

---

## Features

### Core Functionality
- **Real-time Watch Monitoring** — View all configured watches with live status indicators
- **Stoplight Status System** — Green/Yellow/Red/Grey indicators based on response latency thresholds
- **Global Health Summary** — Aggregated status across all watches
- **Response Time Graphs** — Historical latency visualization per watch
- **History Filtering** — Filter data by time range (7, 14, 30, 60, 90 days, or all)

### User Interface
- **Dark/Light Theme** — Toggle between themes (persisted in localStorage)
- **Drag & Drop Reordering** — Customize watch card arrangement
- **Responsive Layout** — Works on desktop and tablet screens
- **Watch Management** — Add, edit, activate/deactivate, and delete watches

### Data Display
- **Uptime Percentage** — Calculated from historical checks
- **Average Response Time** — Mean latency over filtered period
- **Last Check Status** — Most recent check result with timestamp
- **Trend Indicators** — Visual cues for performance direction

---

## Customization

All configuration is centralized in `src/config/app.config.ts`:

### Stoplight Thresholds

```typescript
export const STOPLIGHT_THRESHOLDS = {
  percentile: 95,              // Percentile for latency calculation
  criticalLatencyMs: 3000,     // Red light threshold (ms)
  warningLatencyMs: 1000,      // Yellow light threshold (ms)
  graphAggregation: "percentile",
  watchStatusScope: "total",
  summaryMetricsScope: "total"
};
```

### History Filter Options

```typescript
export const HISTORY_FILTER_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export const DEFAULT_HISTORY_FILTER = 30;
```

### Global Summary Settings

```typescript
export const GLOBAL_SUMMARY_SETTINGS = {
  statusScope: "default",           // "default" | "filtered"
  inactiveWatchInclusion: "never"   // "always" | "never" | "dynamic"
};
```

### Stoplight Animation

```typescript
export const STOPLIGHT_ANIMATION_SETTINGS = {
  strobeScope: "all",          // "all" | "watches" | "summary" | "none"
  strokeSpeedSeconds: 0.5,
  strokeStates: {
    red: true,
    yellow: true,
    green: false,
    grey: false
  }
};
```

---

## Theming

CSS variables are defined in `src/index.css`. Both light and dark themes are fully customizable:

### Key Color Tokens

| Token | Purpose |
|-------|---------|
| `--background` | Page background |
| `--foreground` | Primary text |
| `--primary` | Accent color (buttons, links) |
| `--card` | Card backgrounds |
| `--muted` | Subtle backgrounds |
| `--stoplight-green/yellow/red` | Status indicators |
| `--graph-line/area` | Chart colors |

### Adding Custom Colors

1. Define the HSL values in `src/index.css` under `:root` and `.dark`
2. Add to `tailwind.config.ts` under `theme.extend.colors`
3. Use in components via Tailwind classes

---

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library
- **Recharts** — Data visualization
- **next-themes** — Theme management
- **TanStack Query** — Data fetching

---

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Dashboard.tsx    # Main dashboard view
│   ├── WatchCard.tsx    # Individual watch display
│   ├── GlobalHealth.tsx # Summary health indicator
│   └── ...
├── config/
│   └── app.config.ts    # Centralized configuration
├── lib/
│   ├── api.ts           # API client
│   └── stoplight.ts     # Status calculation logic
├── types/
│   └── api.ts           # TypeScript interfaces
└── index.css            # Design tokens & global styles
```

---

## License

MIT
