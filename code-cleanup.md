# Code Cleanup and Refactoring Plan

This document outlines a plan to improve the overall code quality of the HomeFin application. The focus will be on increasing modularity, reusability, and maintainability by refactoring existing code and addressing technical debt.

## 0. Preamble

Migrate where possible and useful all js to ts. Set the project up for this.

## 1. Componentization

Many pages share common UI elements and logic that can be extracted into reusable components. This will reduce code duplication and make the application easier to maintain.
Complex business logic, such as calculating debt summaries or processing form data, should be moved into utility functions or custom hooks.

### 1.1. UI Components

-   **Stat Cards:** The cards displaying statistics on `DebtorDetailsPage`, `EntityDetailsPage`, and `PaymentMethodsPage` can be turned into a generic `StatCard` component.
-   **Modals:** While there is a base `Modal` component, the modals themselves (e.g., `ConfirmModal`, `DebtSettlementModal`, `MarkAsPaidModal`) can be made more generic where possible.
-   **Page Headers:** The page headers with the title and action buttons can be standardized into a `PageHeader` component.
-   **Filtering UI:** The search, date range, and select filters used in the data tables can be extracted into a `DataTableFilters` component.

### 1.2. Logic Components (Custom Hooks)

-   **Data Fetching and Table State:** The logic for fetching data, pagination, searching, and filtering in the `DataTable` components is repeated across many pages. This can be extracted into a `useDataTable` custom hook.
-   **PDF Generation:** The PDF generation logic, including the progress modal, can be encapsulated in a `usePdfGenerator` hook.
-   **Debt Calculation:** The complex debt calculation logic in `EntityDetailsPage` and `ReceiptFormPage` can be moved into utility functions or a dedicated hook.

## 2. State Management

The current state management relies heavily on `useState`, `useEffect`, and `useCallback` within individual components. This can lead to prop drilling and complex state synchronization.

-   **Data Fetching and Caching:** We should introduce a data fetching and caching library like **React Query (TanStack Query)**. This will simplify data fetching, handle caching, and reduce the need for manual loading and error states.
-   **Global State:** For cross-component state that doesn't fit into the server-state model of React Query (e.g., user settings, theme), we can use a lightweight global state management library like **Zustand**.

## 3. Addressing Technical Debt

-   **Styling:** We should ensure consistent use of `cn` for conditional classes and review the Tailwind CSS usage for any inconsistencies or opportunities for simplification.
-   **Error Handling:** The `useError` hook is a good start, but we should ensure that it is used consistently and that all potential errors are caught and handled gracefully.
