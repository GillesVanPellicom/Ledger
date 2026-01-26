# Performance Review: ScheduleModal Load Times

## Overview
Opening the `ScheduleModal` (and similar modals like `IncomeModal`) currently experiences a noticeable delay. This review identifies the primary bottlenecks and provides a technical explanation for the slowness.

## Primary Bottlenecks

### 1. Heavy Reference Data Fetching on Mount
Even with React Query, the modal triggers multiple data fetches immediately upon opening:
- `useActivePaymentMethods()`
- `useActiveCategories()`
- `useEntities({ page: 1, pageSize: 1000 })`

While React Query caches these, the initial transformation of this data into `Combobox` options happens on every render. Specifically, the `useEntities` hook fetches up to 1,000 entities, including complex subqueries for balances (`TotalPaidToMe`, `TotalIOwe`).

### 2. Expensive `useMemo` Calculations
The modal contains several `useMemo` blocks that run on every render if their dependencies change:
- `methodOptions`: Maps payment methods to combobox format.
- `categoryOptions`: Maps categories to combobox format.
- `entityOptions`: Maps 1,000+ entities to combobox format.
- `showCreateForPastPeriodCheckbox`: This is the most expensive. It calls `calculateOccurrences` which performs date math and recurrence rule parsing for a 1-month range.

### 3. Combobox Rendering Overhead
The `Combobox` component is used for Method, Source/Recipient, and Category. 
- When `entityOptions` contains 1,000 items, the `Combobox` (via `filteredOptions`) must process and potentially render a large list.
- Even if the list is virtualized or capped, the initial filtering and mapping of 1,000 objects in the parent modal blocks the main thread before the modal animation even begins.

### 4. Modal Animation & Portal Latency
The `Modal` component uses `createPortal` and a `setTimeout` delay (10ms) to trigger animations. If the main thread is busy mapping 1,000 entities into combobox options, this `setTimeout` is pushed back, making the modal feel "stuck" or "laggy" during the transition.

### 5. Date-Fns & Recurrence Parsing
The `useEffect` that initializes the form data calls `getCurrentDate()`, `getDate()`, `getDay()`, and `getMonth()` multiple times. While these are fast individually, they add up when combined with the `calculateOccurrences` logic used for the "past period" check.

## Technical Summary of "The Lag"
When you click "Add Schedule":
1. React starts rendering `ScheduleModal`.
2. Hooks trigger. `useEntities` returns a large array.
3. `useMemo` for `entityOptions` runs, iterating over 1,000 entities to create new objects.
4. `useMemo` for `showCreateForPastPeriodCheckbox` runs, parsing the RRule and calculating dates.
5. The `Modal` component attempts to start its animation, but the JavaScript execution for the above steps is still occupying the CPU.
6. The browser cannot paint the modal frame until the JS execution finishes.
7. Result: A 200ms-500ms "dead zone" where the UI doesn't respond to the click.

## Recommendations for Future Optimization
- **Lazy Load Entities**: Don't pass 1,000 entities to the Combobox immediately. Use a search-on-type approach or fetch only active/frequent entities first.
- **Offload Past Period Check**: Only calculate the "past period" occurrences when the recurrence rule or date actually changes, or move it to a background effect.
- **Simplify Entity Query**: The `useEntities` hook used in the modal includes balance calculations which are unnecessary for a simple picker. A `useActiveEntities` hook that only selects `ID` and `Name` would be significantly faster.
- **Virtualize Combobox**: If large lists must be supported, the dropdown list inside `Combobox` should be virtualized to prevent DOM bloat.
