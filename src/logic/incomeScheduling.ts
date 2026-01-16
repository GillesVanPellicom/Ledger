import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  isBefore,
  isSameDay,
  parseISO,
  set,
  getDay,
  getDaysInMonth,
} from 'date-fns';
import { IncomeSchedule } from './incomeCommitments';

/* ==================== Types ==================== */

export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
}

/* ==================== Rule parsing ==================== */

const VALID_TYPES: RecurrenceType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

export function parseRecurrenceRule(ruleStr: string): RecurrenceRule {
  const parts = ruleStr.split(';');

  const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1];
  const intervalRaw = parts.find(p => p.startsWith('INTERVAL='))?.split('=')[1];

  if (!freq || !VALID_TYPES.includes(freq as RecurrenceType)) {
    throw new Error(`Invalid recurrence type: ${freq}`);
  }

  const interval = Math.max(1, parseInt(intervalRaw ?? '1', 10) || 1);

  return { type: freq as RecurrenceType, interval };
}

export function formatRecurrenceRule(rule: RecurrenceRule): string {
  return `FREQ=${rule.type};INTERVAL=${rule.interval}`;
}

/* ==================== Humanization ==================== */

const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const plural = (n: number) => (n > 1 ? 's' : '');
const nth = (d: number) => (d > 3 && d < 21 ? `${d}th` : `${d % 10 === 1 ? d + 'st' : d % 10 === 2 ? d + 'nd' : d % 10 === 3 ? d + 'rd' : d + 'th'}`);

export function humanizeRecurrenceRule(schedule: IncomeSchedule): string {
  const { type, interval } = parseRecurrenceRule(schedule.RecurrenceRule);

  switch (type) {
    case 'DAILY':
      return interval === 1 ? 'Daily' : `Every ${interval} day${plural(interval)}`;
    case 'WEEKLY': {
      const dayName = dayOfWeekNames[schedule.DayOfWeek ?? 0];
      return interval === 1 ? `Weekly on ${dayName}` : `Every ${interval} week${plural(interval)} on ${dayName}`;
    }
    case 'MONTHLY': {
      const day = schedule.DayOfMonth ?? 1;
      return interval === 1 ? `Monthly on the ${nth(day)}` : `Every ${interval} month${plural(interval)} on the ${nth(day)}`;
    }
    case 'QUARTERLY':
      return interval === 1 ? 'Quarterly' : `Every ${interval} quarter${plural(interval)}`;
    case 'YEARLY': {
      const day = schedule.DayOfMonth ?? 1;
      const month = monthNames[schedule.MonthOfYear ?? 0];
      return interval === 1 ? `Annually on ${month} ${nth(day)}` : `Every ${interval} year${plural(interval)} on ${month} ${nth(day)}`;
    }
    default:
      return 'Invalid recurrence';
  }
}

/* ==================== Occurrence calculation ==================== */

/** Safely set day of month */
function safeSetDay(date: Date, day: number) {
  return set(date, { date: Math.min(day, getDaysInMonth(date)) });
}

/** Advance a date according to the rule */
function advanceIterator(iterator: Date, rule: RecurrenceRule, schedule: IncomeSchedule): Date {
  switch (rule.type) {
    case 'DAILY':
      return startOfDay(addDays(iterator, rule.interval));
    case 'WEEKLY':
      return startOfDay(addWeeks(iterator, rule.interval));
    case 'MONTHLY':
      return safeSetDay(addMonths(iterator, rule.interval), schedule.DayOfMonth ?? 1);
    case 'QUARTERLY':
      return safeSetDay(addMonths(iterator, rule.interval * 3), schedule.DayOfMonth ?? 1);
    case 'YEARLY':
      const yMonth = schedule.MonthOfYear ?? 0;
      return safeSetDay(set(addYears(iterator, rule.interval), { month: yMonth }), schedule.DayOfMonth ?? 1);
  }
}

/** Calculate all occurrences in a range */
export function calculateOccurrences(
  schedule: IncomeSchedule,
  rangeStartDate: Date,
  rangeEndDate: Date
): Date[] {
  const rule = parseRecurrenceRule(schedule.RecurrenceRule);
  const occurrences: Date[] = [];

  let iterator = startOfDay(parseISO(schedule.CreationTimestamp));

  // Adjust first occurrence based on rule type
  switch (rule.type) {
    case 'YEARLY':
      iterator = safeSetDay(set(iterator, { month: schedule.MonthOfYear ?? 0 }), schedule.DayOfMonth ?? 1);
      break;
    case 'MONTHLY':
    case 'QUARTERLY':
      iterator = safeSetDay(iterator, schedule.DayOfMonth ?? 1);
      break;
    case 'WEEKLY': {
      const targetDay = schedule.DayOfWeek ?? 0;
      const currentDay = getDay(iterator);
      const offset = (targetDay - currentDay + 7) % 7;
      iterator = addDays(iterator, offset);
      break;
    }
  }

  // Fast-forward to rangeStartDate
  while (isBefore(iterator, rangeStartDate)) {
    iterator = advanceIterator(iterator, rule, schedule);
  }

  // Collect occurrences within the range
  while (isBefore(iterator, rangeEndDate) || isSameDay(iterator, rangeEndDate)) {
    occurrences.push(iterator);
    iterator = advanceIterator(iterator, rule, schedule);
  }

  return occurrences;
}