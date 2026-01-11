# Changes Log

## Refactoring: Data Fetching and Caching with React Query

Implemented a global data fetching and caching strategy using `@tanstack/react-query` to improve performance, reduce prop drilling, and simplify state management.

### 1. Infrastructure Setup
-   **Dependencies:** Added `@tanstack/react-query` to `package.json`.
-   **Configuration:**
    -   Created `src/lib/queryClient.ts` to configure the global `QueryClient` with default stale times (5 minutes) and garbage collection times (24 hours).
    -   Wrapped the application with `QueryClientProvider` in `src/main.tsx`.

### 2. Custom Hooks Implementation
Created a set of custom hooks in `src/hooks/` to encapsulate data fetching logic:

-   **`useReceipts.ts`**:
    -   `useReceipts`: Fetches paginated, filtered, and searched receipts.
    -   `useDeleteReceipt`: Handles receipt deletion and cache invalidation.
-   **`useReferenceData.ts`**:
    -   `useProducts`: Fetches paginated and searched products.
    -   `useStores`: Fetches paginated and searched stores.
    -   `useActiveStores`: Fetches a list of active stores for dropdowns (cached for 10 minutes).
    -   `useInvalidateReferenceData`: Helper to invalidate product/store caches after mutations.
-   **`usePaymentMethods.ts`**:
    -   `usePaymentMethods`: Fetches all payment methods.
    -   `useActivePaymentMethods`: Fetches active payment methods for dropdowns.
    -   `usePaymentMethodBalance`: Fetches and caches the calculated balance for a specific payment method.
    -   `useInvalidatePaymentMethods`: Helper to invalidate payment method caches.
-   **`useEntities.ts`**:
    -   `useEntities`: Fetches all entities (debtors).
    -   `useActiveEntities`: Fetches active entities for dropdowns.
    -   `useInvalidateEntities`: Helper to invalidate entity caches.
-   **`useAnalytics.ts`**:
    -   `useAvailableYears`: Fetches the list of years with available data (cached for 1 hour).
    -   `useAnalyticsData`: Fetches expensive aggregated analytics data (monthly spending, store spending, averages, debt stats) for a selected year. Cached for 5 minutes to prevent unnecessary re-computation.

### 3. Page Refactoring
Updated key pages to use the new hooks, removing manual `useEffect` calls, local loading states, and direct DB queries:

-   **`src/pages/ReceiptsPage.tsx`**: Switched to `useReceipts` and `useDeleteReceipt`.
-   **`src/pages/ReferenceDataPage.tsx`**: Switched to `useProducts` and `useStores`. Added cache invalidation on save.
-   **`src/pages/PaymentMethodsPage.tsx`**: Switched to `usePaymentMethods`. Implemented `usePaymentMethodBalance` within the `PaymentMethodItem` component to efficiently load and cache balances individually.
-   **`src/pages/EntitiesPage.tsx`**: Switched to `useEntities` for the main list.
-   **`src/pages/AnalyticsPage.tsx`**: Switched to `useAvailableYears` and `useAnalyticsData`. This significantly improves performance by caching the heavy aggregation queries.

### 4. Documentation
-   Updated `code-cleanup.md` to reflect the completion of the "Data Fetching and Caching" task.
