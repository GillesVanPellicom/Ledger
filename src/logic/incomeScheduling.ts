import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  isBefore,
  isAfter,
  parseISO,
  isSameDay,
  getDaysInMonth,
  set
} from 'date-fns';

/* ==================== Types ==================== */

export type RecurrenceType =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
}

/* ==================== Rule parsing ==================== */

const VALID_TYPES: RecurrenceType[] = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
];

export function parseRecurrenceRule(ruleStr: string): RecurrenceRule {
  const parts = ruleStr.split(';');

  const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1];
  const intervalRaw = parts.find(p => p.startsWith('INTERVAL='))?.split('=')[1];

  if (!freq || !VALID_TYPES.includes(freq as RecurrenceType)) {
    throw new Error(`Invalid recurrence type: ${freq}`);
  }

  const interval = Math.max(1, parseInt(intervalRaw ?? '1', 10));

  return {
    type: freq as RecurrenceType,
    interval
  };
}

export function formatRecurrenceRule(rule: RecurrenceRule): string {
  return `FREQ=${rule.type};INTERVAL=${rule.interval}`;
}

export function humanizeRecurrenceRule(ruleStr: string): string {
  const { type, interval } = parseRecurrenceRule(ruleStr);

  if (interval === 1) {
    return type.charAt(0) + type.slice(1).toLowerCase();
  }

  return `Every ${interval} ${type.toLowerCase()}${interval > 1 ? 's' : ''}`;
}

/* ==================== Date helpers ==================== */

/**
 * Clamp a date to the anchor day inside the target month.
 * Prevents overflow like Feb 31 → Mar 3.
 */
function applyAnchorDay(base: Date, anchorDay: number): Date {
  const daysInMonth = getDaysInMonth(base);
  return set(base, { date: Math.min(anchorDay, daysInMonth) });
}

function monthsForRule(rule: RecurrenceRule): number | null {
  switch (rule.type) {
    case 'MONTHLY':
      return rule.interval;
    case 'QUARTERLY':
      return rule.interval * 3;
    default:
      return null;
  }
}

/* ==================== Recurrence stepping ==================== */

function nextOccurrence(
  current: Date,
  anchor: Date,
  rule: RecurrenceRule
): Date {
  const anchorDay = anchor.getDate();
  const anchorMonth = anchor.getMonth();

  // Month-based rules (MONTHLY / QUARTERLY)
  const monthStep = monthsForRule(rule);
  if (monthStep !== null) {
    const base = addMonths(current, monthStep);
    return startOfDay(applyAnchorDay(base, anchorDay));
  }

  switch (rule.type) {
    case 'DAILY':
      return startOfDay(addDays(current, rule.interval));

    case 'WEEKLY':
      return startOfDay(addWeeks(current, rule.interval));

    case 'YEARLY': {
      const base = addYears(current, rule.interval);
      const monthAligned = set(base, { month: anchorMonth });
      return startOfDay(applyAnchorDay(monthAligned, anchorDay));
    }

    default: {
      // Exhaustiveness guard
      const _never: never = rule.type;
      throw new Error(`Unsupported recurrence type: ${_never}`);
    }
  }
}

/* ==================== Occurrence calculation ==================== */

/**
 * Calculates all occurrences of a schedule between a start and end date.
 */
export function calculateOccurrences(
  scheduleStartDate: Date | string,
  ruleStr: string,
  rangeStartDate: Date,
  rangeEndDate: Date
): Date[] {
  const rule = parseRecurrenceRule(ruleStr);

  const anchor = startOfDay(
    typeof scheduleStartDate === 'string'
      ? parseISO(scheduleStartDate)
      : scheduleStartDate
  );

  const occurrences: Date[] = [];
  let current = anchor;

  // Fast-forward to first occurrence >= rangeStartDate
  while (isBefore(current, rangeStartDate)) {
    current = nextOccurrence(current, anchor, rule);
  }

  // Collect occurrences in range
  while (!isAfter(current, rangeEndDate)) {
    occurrences.push(current);
    current = nextOccurrence(current, anchor, rule);
  }

  return occurrences;
}