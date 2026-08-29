# TrafficVision AI — Frontend & Multi-Area Testing Suite

Welcome to the frontend and detection/testing suite for **TrafficVision AI** — a smart traffic prediction and congestion management platform.

This project delivers:
1. A **React (Vite)** frontend application with interactive Leaflet mapping, high-density congestion highlighting, auto-polling disruptions feed, Recharts analytics, route inspector, and JWT authentication.
2. A **Postman/Newman API Test Suite** (`TrafficVision_API_Test_Collection.json`) for verifying system behavior under low, moderate, high, and severe conditions across multiple corridors.
3. A **Vitest + React Testing Library** unit test suite for frontend components.
4. A step-by-step **Manual Testing Checklist** for seeded database locations and routes.

---

## 🛠️ Tech Stack & Dependencies

- **Frontend**: React 19, Vite 8, React Router v7, Axios
- **Map & Visualization**: Leaflet, React-Leaflet 5, Recharts 3
- **Testing**: Vitest, @testing-library/react, @testing-library/jest-dom, jsdom
- **Backend API**: Node.js/Express + PostgreSQL (running on port `5000`)

---

## 📊 System Architectural Specifications & Assumptions

### 1. Speed & Congestion Threshold Definitions
- **Congestion Bottlenecks (High / Severe)**: Defined by speed ratio `current_speed / free_flow_speed < 0.5` (or absolute speed `< 30 km/h`). Used across `trafficController.js` (`getCongestionLevel`), `predictionController.js`, and `routeController.js`.
- **Sub-optimal Speed Performance Flag**: Defined by speed ratio `< 0.6` in `SpeedPanel.jsx`. Flags locations operating below 60% of design free-flow speed for early operational bottleneck warnings.

### 2. Dashboard Travel Time Scope (`avg_travel_time_mins`)
- `avg_travel_time_mins` in `getDashboardSummary` (`analyticsController.js`) is calculated across **ALL monitored locations with recorded traffic data** using their latest observed speed normalized over a standard 2.5 km corridor segment length.

### 3. Server Sync & Polling Architecture
- **Server Refresh**: External TomTom API fetching occurs strictly server-side every **15 minutes** via a `node-cron` job (`*/15 * * * *`) in `server.js`.
- **Frontend Heatmap Polling**: `CongestionHeatMap.jsx` polls the internal `/api/traffic` endpoint on a user-selectable **15s – 30s** timer to reflect DB updates smoothly without invoking duplicate external API requests.

---

## 🚀 Quick Start Guide

### 1. Start the Backend API Server
Before running the frontend, ensure PostgreSQL is running and start the backend:
```bash
cd trafficvision-backend
npm install
npm start
# Server runs on http://localhost:5000
```

### 2. Start the React Frontend Application
In a separate terminal:
```bash
cd trafficvision-frontend
npm install
npm run dev
# Frontend dev server starts at http://localhost:5173
```

---

## 🧪 Running the Test Suite

### A. Frontend Unit Tests (Vitest + React Testing Library)
Run the automated component test suite:
```bash
cd trafficvision-frontend
npm test
```
The test suite verifies:
- `MapView`: Renders color-coded markers (🟢 Low, 🟡 Moderate, 🟠 High, 🔴 Severe) and high-density heat radius circles.
- `AlertsPanel`: Verifies auto-sorting by severity (`critical` > `warning` > `info`), severity badge formatting, and empty fallback state.
- `AnalyticsDashboard`: Verifies chart rendering resilience with full, partial, or empty backend dataset responses.

### B. Postman / Newman Multi-Area API Collection
Import `TrafficVision_API_Test_Collection.json` into Postman, or execute via Newman:
```bash
npx newman run TrafficVision_API_Test_Collection.json
```
The collection tests:
- Route congestion analysis (`GET /api/routes/:id/analysis`)
- Segment travel time estimation (`GET /api/routes/:id/travel-time`)
- AI predictions for low, moderate, high, and severe locations (`POST /api/predictions/:location_id`)
- Alerts categorization (`GET /api/alerts`)
- Analytics KPI summary (`GET /api/analytics/dashboard-summary`)

---

## 📋 Manual Testing Checklist

| Test Case | Scenario / Condition | Endpoint / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | Low Congestion Location | Click pin `Tech Corridor & Innovation Blvd` (`33333333-...`) on Map | Marker renders Green 🟢. Speed > 50 km/h, vehicle count low. |
| **TC-02** | Moderate Congestion | Click pin `Downtown Arterial` (`22222222-...`) | Marker renders Yellow 🟡. Speed ~40-45 km/h. |
| **TC-03** | High / Severe Density | Click pin `Central Expressway` (`11111111-...`) | Marker renders Red/Orange 🔴 with pulsing high-density heat radius circle. |
| **TC-04** | AI Prediction Trigger | Click "🤖 Predict Next 15m" on location popup | Returns predicted congestion level and automatically posts a `warning` or `critical` alert to the Disruptions Panel if high/severe. |
| **TC-05** | Route Travel Time | Open "🛣️ Route Inspector" tab & select `Test Route: Seed Verification` | Renders total travel time in mins, total km, and segment breakdown table without errors. |
| **TC-06** | Alerts Panel Polling | Keep "🚨 Unusual Disruptions" panel open for 20 seconds | Auto-refreshes alerts list and updates "Last updated" timestamp automatically. |
| **TC-07** | Analytics Resilience | Toggle Time Range filters (`24h`, `7d`, `30d`) | Recharts line and bar charts re-render dynamically. |
| **TC-08** | Authentication Flow | Register new user at `/signup` & sign in at `/login` | Receives JWT token, stores in `localStorage`, and navigates to protected `/dashboard`. |

---

## 📁 Key Frontend Component Architecture

```
src/
├── api/                     # Modular Axios Service Layer
│   ├── authApi.js           # Login & Signup endpoints
│   ├── trafficApi.js        # Monitored locations & TomTom sync
│   ├── routeApi.js          # Route analysis & travel times
│   ├── alertApi.js          # Live unusual disruptions
│   ├── predictionApi.js     # AI congestion predictions
│   └── analyticsApi.js      # Historical trends & summary stats
├── components/
│   ├── MapView.jsx          # Leaflet map with color-coded pins & density highlights
│   ├── AlertsPanel.jsx      # Auto-polling disruptions feed (15-30s interval)
│   ├── AnalyticsDashboard.jsx# Recharts dynamic visualization widgets
│   ├── RouteInspector.jsx   # Route analysis scores & travel time breakdown
│   └── Navbar.jsx           # Top header navigation & TomTom sync trigger
├── pages/
│   ├── Login.jsx            # Sign in page
│   ├── Signup.jsx           # Sign up page
│   └── Dashboard.jsx        # Integrated main monitoring hub
└── tests/                   # Vitest unit test suite
    ├── MapView.test.jsx
    ├── AlertsPanel.test.jsx
    └── AnalyticsDashboard.test.jsx
```
