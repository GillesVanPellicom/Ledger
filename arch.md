# Architecture Documentation

## High-Level Overview

**ledger** (originally named `homefin`) is a desktop personal finance application built with **Electron**, **React**, and **SQLite**. It follows a local-first architecture where the database and all user data reside on the user's machine.

The application is structured as a standard Electron app with two main processes:
1.  **Main Process (Node.js)**: Handles the application lifecycle, window management, native file system access, and direct database interactions.
2.  **Renderer Process (React)**: Handles the UI, routing, and business logic, communicating with the Main Process via a secure IPC bridge.

## Tech Stack

*   **Runtime**: Electron
*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS, Headless UI, Heroicons, Lucide React
*   **State Management**:
    *   **Client State**: Zustand (`useSettingsStore`, `useErrorStore`, `useUIStore`)
    *   **Server State**: TanStack Query (React Query)
*   **Database**: SQLite3 (via `sqlite3` Node driver)
*   **Persistence**: Custom JSON file-based store (`electron/store.cjs`) for user preferences. Settings are stored in `datastore/settings/settings.json` with a bootstrap pointer in `userData`.
*   **Charting**: ECharts (via `echarts-for-react`)
*   **Utilities**: `date-fns`, `jspdf`

## Project Structure

```
/
├── electron/               # Backend (Main Process) code
│   ├── main.cjs            # Entry point, IPC handlers, DB connection
│   ├── preload.cjs         # Context bridge, exposes API to Renderer
│   ├── store.cjs           # Custom settings store implementation
│   ├── db_schema.sql       # Database schema definition
│   ├── db/                 # Database helpers (migrations, seeding)
│   └── migrations/         # SQL migration files
├── src/                    # Frontend (Renderer Process) code
│   ├── components/         # Reusable UI components
│   │   ├── layout/         # Layout wrappers (MainLayout, Sidenav)
│   │   ├── ui/             # Generic UI elements (Button, Card, Modal, Combobox, NanoDataTable)
│   │   └── ...             # Feature-specific components
│   ├── pages/              # Route-level page components
│   ├── store/              # Zustand stores
│   ├── utils/              # Helper functions (db wrapper, formatters)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Library configurations (queryClient)
│   ├── App.tsx             # Main routing and layout setup
│   └── main.tsx            # App entry point, providers setup
├── datastore/              # Default location for local DB and images
└── package.json            # Dependencies and scripts
```

## Data Flow & Communication

The application uses a **Request/Response** pattern for data fetching, mediated by Electron's IPC (Inter-Process Communication).

1.  **Frontend Request**: A React component (usually via a TanStack Query hook) calls a helper function in `src/utils/db.ts`.
2.  **IPC Bridge**: The helper calls `window.electronAPI.queryDb(sql, params)`, defined in `electron/preload.cjs`.
3.  **Main Process**: `electron/main.cjs` listens for the `query-db` event. It executes the raw SQL query against the SQLite database instance.
4.  **Response**: The result (rows or operation status) is sent back to the Renderer process and resolved by the Promise.

**Key IPC Channels:**
*   `query-db`: Execute arbitrary SQL.
*   `create-transaction`: Atomic operation for creating deposits/transfers.
*   `delete-transaction`: Atomic operation for deleting transactions.
*   `save-settings` / `get-settings`: Persist app configuration.
*   `save-pdf`: Generate and save PDF reports.
*   `trigger-backup`: Create a database backup.

## Database Schema

The SQLite database (`fin.db`) is relational and normalized. Key tables include:

*   **Receipts**: Central entity. Links to `Stores`, `PaymentMethods`, and `Debtors`.
*   **LineItems**: Individual items on a receipt. Links to `Products`.
*   **Products**: Items with `ProductUnits` (e.g., "Milk" - "L").
*   **PaymentMethods**: Accounts (Cash, Bank). Tracks funds.
*   **Transfers**: Records of money moving between Payment Methods.
*   **TopUps**: Deposits or incoming transfers into a Payment Method.
*   **Debtors**: Entities involved in debt/loans.
*   **ReceiptSplits**: Defines how a receipt's cost is shared.

*Note: All tables include `CreationTimestamp` and `UpdatedAt` columns with automatic triggers.*

## Key Components & Pages

*   **`App.tsx`**: Handles initial onboarding (Welcome/User Setup) and defines the `HashRouter` routes.
*   **`MainLayout.tsx`**: Provides the persistent Sidebar and Header structure.
*   **`Sidenav.tsx`**: Responsive sidebar navigation with smooth transitions and square icon buttons when collapsed.
*   **`ReceiptsPage.tsx`**: The dashboard view, showing recent receipts and summaries.
*   **`ReceiptFormPage.tsx`**: Complex form for creating/editing receipts, handling line items, and splits.
*   **`ReceiptViewPage.tsx`**: Detailed view of a receipt, featuring a responsive summary card, item list with filtering (via `Combobox`), and debt breakdown.
*   **`PaymentMethodDetailsPage.tsx`**: Detailed view of an account, including a transaction history (DataTable) and transfer functionality.
*   **`AnalyticsPage.tsx`**: Visualizations of spending habits using ECharts.

## State Management

1.  **Zustand**: Used for global *client-side* state that doesn't come from the DB.
    *   `useSettingsStore`: Theme, user name, database path.
    *   `useErrorStore`: Global error modal state.
    *   `useUIStore`: UI state like sidenav collapse status.
2.  **TanStack Query**: Used for *server-side* (database) state.
    *   Handles caching, deduping, and refetching of SQL query results.
    *   Keys are typically structured like `['receipts', id]` or `['referenceData']`.

## Configuration

*   **Vite**: Bundles the React application. Configured in `vite.config.js`.
*   **Electron Builder**: Packages the app for distribution (DMG, Portable EXE). Configured in `package.json`.
*   **Tailwind**: Configured in `tailwind.config.js` for styling.

## Deep Dive: Coding Style & Patterns

The codebase follows a **functional, hook-based React style**.

*   **Component Structure**: Components are generally self-contained, with logic (state, effects, handlers) defined at the top and JSX returned at the bottom.
*   **Manual State Management**: Forms (like `ReceiptFormPage`) rely heavily on `useState` and manual change handlers rather than form libraries like Formik. This provides granular control but results in more boilerplate code.
*   **Effect-Heavy Logic**: `useEffect` is frequently used for data fetching (though migrating to TanStack Query), synchronizing state (e.g., saving drafts to localStorage), and handling side effects.
*   **Utility-First CSS**: Tailwind CSS is used exclusively for styling, with `clsx` and `tailwind-merge` (via `cn` utility) for dynamic class composition.

## Deep Dive: Complex Components

### `DataTable.tsx`
This is a highly reusable and feature-rich component (`src/components/ui/DataTable.tsx`).
*   **Dynamic Layout**: Uses `useLayoutEffect` to measure content and switch between `table-layout: auto` and `fixed` to handle responsive sizing intelligently.
*   **Features**: Built-in pagination, search (with debouncing), row selection (checkboxes), and custom slot injection (`topRowLeft`, etc.).
*   **API**: Accepts a generic `data` array and a `columns` configuration array, making it adaptable to any data type.

### `NanoDataTable.tsx`
A lightweight version of `DataTable` (`src/components/ui/NanoDataTable.tsx`) used for simpler lists or nested tables (e.g., inside `ReceiptViewPage`).
*   **Features**: Supports custom headers and row rendering.
*   **Empty State**: Displays a "No results found" message with an icon when data is empty.

### `Combobox.tsx`
A robust, searchable dropdown component (`src/components/ui/Combobox.tsx`).
*   **Features**: Fuzzy search, keyboard navigation, and portal-based rendering for z-index management.
*   **Stability**: Uses `useLayoutEffect` and `requestAnimationFrame` for smooth positioning and focus management.

### `DataGrid.tsx`
A responsive grid component (`src/components/ui/DataGrid.tsx`) for displaying card-like items.
*   **Responsive**: Uses `ResizeObserver` and `useLayoutEffect` to dynamically calculate the number of columns based on the container width and a `minItemWidth` prop.
*   **Visuals**: Uses CSS Grid with inline styles for column definition and Tailwind for borders.
*   **UX**: Renders placeholder items to ensure the grid always looks complete, even if the last row isn't full.

### `ReceiptFormPage.tsx`
The most complex page in the application (`src/pages/ReceiptFormPage.tsx`).
*   **Draft System**: Automatically saves form state to `localStorage` (`receipt_concept`) to prevent data loss.
*   **Dynamic Modes**: Switches between "Itemised" (line-by-line) and "Item-less" (total only) modes.
*   **Debt Logic**: Handles complex debt splitting scenarios (`total_split` vs `line_item`), including validation to prevent changing modes when debts are already settled.
*   **Validation**: Custom `validate` function checks for required fields and logical consistency (e.g., non-negative prices).

## Hooks & Utils

### Hooks (`src/hooks/`)
Custom hooks encapsulate complex logic, primarily for data fetching and side effects.
*   **`useReceipts.ts`**: Uses TanStack Query to fetch receipts. It constructs complex SQL queries dynamically based on filter parameters (date range, search term) and handles pagination logic.
*   **`useDataTable.ts`**: A generic hook that powers server-side pagination, sorting, and searching for any table. It manages the state for `page`, `pageSize`, and `searchTerm`, and builds the corresponding SQL queries.
*   **`useAnalytics.ts`**: Fetches aggregated data for charts, handling date grouping and category summation.

### Utilities (`src/utils/`)
*   **`db.ts`**: A thin wrapper around the Electron IPC `query-db` channel. It provides a Promise-based API (`db.query`, `db.queryOne`, `db.execute`) for the frontend to run SQL.
*   **`pdfGenerator.ts`**: Uses `jspdf` and `jspdf-autotable` to generate PDF reports. It handles multi-page layouts, image embedding (via Base64 conversion from the backend), and summary pages.
*   **`discountCalculator.ts`**: Centralizes the logic for applying discounts to line items, ensuring consistency across the app.
*   **`cn.ts`**: Standard utility for merging Tailwind classes.
