# Code Cleanup and Refactoring Plan

This document outlines a plan to improve the overall code quality of the HomeFin application. The focus will be on increasing modularity, reusability, and maintainability by refactoring existing code and addressing technical debt.

## 0. Preamble

Migrate where possible and useful all js to ts. Set the project up for this.

## 1. Componentization

Many pages share common UI elements and logic that can be extracted into reusable components. This will reduce code duplication and make the application easier to maintain.
Complex business logic, such as calculating debt summaries or processing form data, should be moved into utility functions or custom hooks.

### 1.1. Logic Components (Custom Hooks)

Implement:

-   **Data Fetching and Table State:** The logic for fetching data, pagination, searching, and filtering in the `DataTable` components is repeated across many pages. This can be extracted into a `useDataTable` custom hook.
-   **PDF Generation:** The PDF generation logic, including the progress modal, can be encapsulated in a `usePdfGenerator` hook.
-   **Debt Calculation:** The complex debt calculation logic in `EntityDetailsPage` and `ReceiptFormPage` can be moved into utility functions or a dedicated hook.

**Status:**
- `useDataTable` created in `src/hooks/useDataTable.ts`.
- `usePdfGenerator` created in `src/hooks/usePdfGenerator.ts`.
- `useDebtCalculation` created in `src/hooks/useDebtCalculation.ts`.

## 2. State Management

The current state management relies heavily on `useState`, `useEffect`, and `useCallback` within individual components. This can lead to prop drilling and complex state synchronization.
Implement:
### 2.1. Data Fetching and Caching
We should introduce a data fetching and caching library like **React Query (TanStack Query)**. This will simplify data fetching, handle caching, and reduce the need for manual loading and error states. 
Specifically this has to be implemented to cache costly query results. This has to be a global change. Implement the caching wherever it's deemed useful.

**Status:**
- Added `@tanstack/react-query` dependency.
- Configured `QueryClient` in `src/lib/queryClient.ts`.
- Wrapped application with `QueryClientProvider` in `src/main.tsx`.
- Implemented `useReceipts` hook in `src/hooks/useReceipts.ts` to fetch receipts using React Query.
- Updated `ReceiptsPage.tsx` to use `useReceipts` hook.
- Implemented `useReferenceData` hooks (`useProducts`, `useStores`, `useActiveStores`) in `src/hooks/useReferenceData.ts`.
- Updated `ReferenceDataPage.tsx` to use `useReferenceData` hooks.
- Implemented `usePaymentMethods` hooks (`usePaymentMethods`, `useActivePaymentMethods`, `usePaymentMethodBalance`) in `src/hooks/usePaymentMethods.ts`.
- Updated `PaymentMethodsPage.tsx` to use `usePaymentMethods` hooks.
- Implemented `useEntities` hooks (`useEntities`, `useActiveEntities`) in `src/hooks/useEntities.ts`.
- Updated `EntitiesPage.tsx` to use `useEntities` hooks.
- Refactored `useDebtCalculation` to use React Query for caching debt stats.
- Updated `EntitiesPage.tsx` and `EntityDetailsPage.tsx` to use the refactored `useDebtCalculation`.
- Implemented `useAnalytics` hooks (`useAvailableYears`, `useAnalyticsData`) in `src/hooks/useAnalytics.ts` to cache expensive aggregation queries.
- Updated `AnalyticsPage.tsx` to use `useAnalytics` hooks.

### 2.2. Global State
For cross-component state that doesn't fit into the server-state model of React Query (e.g., user settings, theme), we can use a lightweight global state management library like **Zustand**. Implement and switch over features e.g theme and any other deemed applicable.

## 3. Addressing Technical Debt

-   **Styling:** We should ensure consistent use of `cn` for conditional classes and review the Tailwind CSS usage for any inconsistencies or opportunities for simplification.
-   **Error Handling:** The `useError` hook is a good start, but we should ensure that it is used consistently and that all potential errors are caught and handled gracefully.
