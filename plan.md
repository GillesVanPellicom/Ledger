# Project Plan: HomeFin Receipt Manager

## Goals
- **Data Integrity**: Track receipts with line-item detail, preventing duplicate products and ensuring no "garbage data" enters the system via strict validation.
- **UX/UI**: Modern, maintainable CRUD interface with a focus on efficiency (keyboard support, fast navigation).
- **Architecture**: Modular, DRY code with centralized styling and reusable components. SQL queries isolated in external files.

## Tech Stack
- **Core**: Electron, React, Vite
- **Styling**: Tailwind CSS
- **Database**: SQLite (accessed via IPC)
- **Visualization**: Apache ECharts

## Design System
- **Theme**: 
  - Dark Mode: `#000000` background.
  - Light Mode: `#FFFFFF` background.
  - Accent: `#007AFF` (macOS Button Blue).
  - Danger: Standardized Red (e.g., `#FF3B30`).
- **Navigation**: 
  - **Sidenav**: Collapsible (Full text vs. Icons only). Links: Receipts, Products, Analytics. Dark mode toggle at bottom.
  - **Backstack**: Non-nav pages (View/Edit/Create) feature a top-left back button that pops the browser history stack.
- **Components**:
  - **Modals**: Global blur backdrop. Click-outside to dismiss. Support for stacking (e.g., Add Product modal on top of Edit Receipt).
  - **Tables**: Built-in pagination (controls at **top and bottom**), search bar, and sortable headers.

---

## Phase 1: Infrastructure & Setup
**Goal**: Establish the project foundation, database connection, and basic layout.

1.  **Project Initialization**
    - Ensure Vite + React + Electron setup is correct.
    - Configure Tailwind CSS:
        - Define colors: `bg-black`, `bg-white`, `accent-[#007AFF]`.
        - Setup Dark/Light mode toggle logic (persisted in local storage/electron store).
    - Set up `clsx` and `tailwind-merge` for robust class handling.

2.  **Database Layer**
    - Set up SQLite connection in the Electron main process.
    - Create `utils/db` structure.
    - **Query Management**: Create a `queries/` folder. Implement a helper to read `.sql` files so no SQL is hardcoded in JS.
    - Implement IPC handlers (e.g., `db:query`, `db:execute`).

3.  **Navigation & Layout**
    - Create `MainLayout` component (Sidenav + Content Area).
    - **Sidenav Component**:
        - State: `isCollapsed` (persisted).
        - Navigation Links.
    - **Router Setup**:
        - Define routes: `/` (Receipts), `/products`, `/analytics`, `/receipts/view/:id`, `/receipts/edit/:id`, `/receipts/new`.
        - Implement `Header` component for non-root routes containing the **Back Button**.

## Phase 2: Core Components
**Goal**: Build the reusable UI library. This is critical for the "modular" requirement.

1.  **Base UI Elements**
    - `Button`: Primary (Blue), Secondary (Gray), Danger (Red).
    - `Input`: Text, Number (with validation), Currency (Euro), Date.
    - `Select/Combobox`: For selecting Stores/Units.
    - `Card`: Standard container with padding/shadow options.

2.  **Complex Components**
    - **Modal System**:
        - `Modal` component: Portal-based, backdrop blur, `onClose` prop.
        - Standardized "Delete Confirmation" modal variant.
    - **DataTable**:
        - Props: `data`, `columns`, `totalCount`, `pageSize`, `onPageChange`, `onSearch`.
        - **Layout**: Search bar -> Top Pagination -> Table -> Bottom Pagination.
    - **Gallery**:
        - **Thumbnail Grid**: Display small previews.
        - **Fullscreen Viewer**: Overlay with large image, Left/Right arrows, Close button.

## Phase 3: Master Data Management (Products & Stores)
**Goal**: Enable creation and management of the building blocks.

1.  **Stores Management**
    - SQL: `queries/stores/*.sql` (Get All, Insert, Update).
    - UI: Simple modal or settings section to manage stores.

2.  **Products Management**
    - SQL: `queries/products/*.sql`.
    - **Products Page**:
        - Full CRUD table.
        - **Add/Edit Product Modal**: Fields for Name, Brand, Size, Unit, Price (default).
    - **Product Selection Component** (The "Chooser"):
        - A specialized Modal containing a `DataTable` of products.
        - **"Add New" Flow**: If product isn't found, a button switches the modal content (or opens a nested modal) to the "Create Product" form. Upon save, it auto-selects the new product.

## Phase 4: Receipt Management (The Core)
**Goal**: Implement the main workflow.

1.  **Receipts List (Home)**
    - SQL: `queries/receipts/get_all.sql` (Join Stores).
    - **Table**: Date, Store, Note, Actions (View, Delete).
    - **Delete**: Triggers Confirmation Modal. Deletes Receipt + LineItems + Images.

2.  **Create/Edit Receipt**
    - **Route**: `/receipts/new` and `/receipts/edit/:id`.
    - **Form**:
        - Header: Date picker, Store selector, Note input.
        - **Line Items Table**:
            - Columns: Product Name, Quantity, Unit Price, Total.
            - Footer: "Add Item" button -> Opens **Product Selection Component**.
            - Row Actions: Edit (qty/price), Remove.
        - **Images Section**:
            - "Add Image" button (File picker).
            - Thumbnail preview.
            - Clicking thumbnail opens **Gallery**.

3.  **View Receipt**
    - **Route**: `/receipts/view/:id`.
    - **Layout**: Read-only version of the Edit page.
    - **Actions**: "Edit" button (navigates to Edit page).

## Phase 5: Analytics & Refinement
**Goal**: Add insights and polish.

1.  **Analytics**
    - **Page**: `/analytics`.
    - **Charts**:
        - Monthly Spending per year, trends and gains/losses compared to next month and if available previous year same month.
        - Spending by Store (Pie).
        - 
        - Selectable per week/month/year or fine tunable via a from-to calendar (all for a specific year) top 10 products bought by price. Eg 500 euro spent on water, etc. This is a specific page with a chart at the top and then a table component order DESC for the non top 10.
    - Use `apache-echarts` for rendering.
    - Make year selection dynamic based on records. Eg earliest receipt is 2023, first year you can select is 2023.

2.  **Polish & Optimization**
    - **Performance**: Ensure `DataTable` handles large datasets efficiently (server-side pagination logic in SQL).
    - **UX**: Verify Tab order, Focus management (especially in Modals), and Dark Mode consistency.
    - **Code Quality**: Final refactor to ensure DRY principles (e.g., extracting common form logic).
