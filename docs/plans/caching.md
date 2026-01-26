# Plan: Implement Dependency-Tracking Cache with Automatic Invalidation (Revised)

## Objective
Upgrade the existing TTL-based Zustand cache mechanism to support dependency-based invalidation. This ensures that when data is modified (e.g., a transaction is added), all cached queries relying on that data (e.g., monthly spending, account balances) are automatically invalidated, while retaining a 1-minute TTL as a safety fallback.

---

## 1. Architecture & Data Structure Design

### 1.1 Cache Entry Structure
Modify the internal storage interface within the Zustand store.

**Current:**
{ value: any, timestamp: number }

**New:**

```typescript
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  dependsOn: Set<string>;           // Source identifiers (table-level preferred)
}
```

---

### 1.2 Source Identifier System
Define a strict, typed naming convention to avoid magic strings.

Create `src/utils/cacheKeys.ts`:

```typescript
export const cacheKeys = {
  table: {
    users:           "table:users"           as const,
    entities:        "table:entities"        as const,
    categories:      "table:categories"      as const,
    expenses:        "table:expenses"        as const,
    income:          "table:income"          as const,
    transfers:       "table:transfers"       as const,
    paymentMethods:  "table:paymentMethods"  as const,
    settings:        "table:settings"        as const,
    pendingIncome:   "table:pendingIncome"   as const,
    // add others as needed
  },
  entity: (tableKey: keyof typeof cacheKeys.table, id: string | number) =>
    `${cacheKeys.table[tableKey].replace("table:", "")}:${id}` as const,
} as const;

// Convenience helpers
export const invalidateTables = (tables: (keyof typeof cacheKeys.table)[]) =>
  tables.map(t => cacheKeys.table[t]);
```

**Guiding rule:**  
Use table-level keys by default. Entity-level keys (`expense:12345`) should only be introduced when a concrete, measurable performance problem is identified (e.g., very frequent single-account balance recalculation while others remain stable).

---

## 2. Store Implementation Updates

### 2.1 Update `setCache`
New signature — TTL is decided at write time (more natural mental model).

```typescript
setCache<T>(
  key: string,
  value: T,
  options?: {
    ttlMs?: number;           // default = 60_000
    dependsOn?: string[];     // source identifiers
  }
)
```

**Logic:**

```
const { ttlMs = 60_000, dependsOn = [] } = options ?? {};
Store: { value, timestamp: Date.now(), dependsOn: new Set(dependsOn) }
```

**Backward compatibility:**  
If old code calls `setCache(key, value, oldTtlNumber)`, treat the second number arg as `ttlMs` and `dependsOn: []`.

---

### 2.2 Update `getCache`
Simplified — no TTL parameter on read.

```typescript
getCache<T>(key: string): T | undefined
```

**Logic:**

```
Retrieve entry
If missing → undefined
If Date.now() - entry.timestamp > 60_000 → delete entry → undefined
Else → return entry.value
```

---

### 2.3 Implement `invalidateSources` + Reverse Index
Add reverse index to avoid O(N) full scans.

**Internal state additions (inside Zustand store):**

```typescript
cache: Map<string, CacheEntry<any>>;
reverseIndex: Map<string, Set<string>>;  // sourceId → Set<cacheKey>
```

**invalidateSources logic:**

```typescript
invalidateSources(sourceIds: string[]) {
  const toRemove = new Set<string>();

  for (const source of sourceIds) {
    const dependents = this.reverseIndex.get(source) ?? new Set();
    for (const key of dependents) {
      toRemove.add(key);
    }
  }

  for (const key of toRemove) {
    this.cache.delete(key);
    // Also clean reverseIndex for this key
  }

  if (import.meta.env.DEV) {
    console.log(`Invalidated ${toRemove.size} keys due to sources:`, sourceIds);
  }
}
```

**Update `setCache` to maintain reverse index:**

```typescript
const oldEntry = this.cache.get(key);
if (oldEntry) {
  for (const oldSource of oldEntry.dependsOn) {
    const deps = this.reverseIndex.get(oldSource);
    if (deps) {
      deps.delete(key);
      if (deps.size === 0) this.reverseIndex.delete(oldSource);
    }
  }
}

this.cache.set(key, { value, timestamp: Date.now(), dependsOn: new Set(dependsOn) });

for (const source of dependsOn) {
  if (!this.reverseIndex.has(source)) {
    this.reverseIndex.set(source, new Set());
  }
  this.reverseIndex.get(source)!.add(key);
}
```

---

## 3. Integration: Read Operations (Caching)

Fetching categories → dependsOn: invalidateTables(['categories'])

Receipt list → dependsOn: invalidateTables(['expenses', 'income'])

Single receipt → dependsOn: invalidateTables(['expenses']).concat(cacheKeys.entity('expenses', id)) (only if needed)

Balances / stats → dependsOn: invalidateTables(['income', 'expenses', 'transfers'])

---

## 4. Integration: Write Operations (Invalidation)

Receipt/Income form save → invalidateSources(invalidateTables(['expenses', 'income', 'paymentMethods']))

Entity create/update/delete → invalidateSources(invalidateTables(['entities']))

Settings change → invalidateSources(invalidateTables(['settings']))

Scheduled income processing → invalidateSources(invalidateTables(['pendingIncome', 'income', 'expenses']))

---

## 5. Refactoring & Cleanup

Replace all old setCache(key, value, Infinity) or disabled TTL with explicit ttlMs: 60_000 (or longer only when justified)

Ensure old calls without options continue to work (default 60s, empty dependsOn)

Prefer table-level invalidation; only use entity-level when proven necessary

---

## 6. Verification Plan

Test TTL:
- Set a short TTL (e.g. 1000 ms)
- Set cache
- Wait > 1000 ms
- Ensure getCache returns undefined

Test Dependency:
- Cache a "Total Balance" entry with dependsOn: ['table:transactions']
- Call invalidateSources(['table:transactions'])
- Ensure "Total Balance" key is removed from cache

Test Isolation:
- Cache "User List" with dependsOn: ['table:users']
- Call invalidateSources(['table:transactions'])
- Ensure "User List" remains in cache

Test Reverse Index:
- Cache several keys depending on same source
- Invalidate that source
- Confirm only dependent keys are removed

---

## 7. Development & Debugging Tools

Dev-mode logging:
- Wrap invalidation logging with if (import.meta.env.DEV)
- Log format: cache key invalidated, triggering source(s), timestamp

SettingsModal → "Cache / Dev Tools" tab (dev builds only):
- Toggle: Enable invalidation logging
- Show: Current cache size, last invalidation time
- Buttons: "Invalidate All", "Clear Cache"
- (optional) List of cached keys + their dependsOn + age