import {
  format,
  addDays,
  startOfDay,
  parseISO,
  isAfter,
  subMonths
} from 'date-fns';

import { incomeCommitments } from './incomeCommitments';
import { calculateOccurrences } from './incomeScheduling';
import { db } from '../utils/db';

/* ==================== Helpers ==================== */

function normalizeDateString(date: string): string {
  return format(startOfDay(parseISO(date)), 'yyyy-MM-dd');
}

function lookbackMonthsForRule(rule: string): number {
  if (rule.includes('FREQ=DAILY')) return 1;
  if (rule.includes('FREQ=WEEKLY')) return 2;
  if (rule.includes('FREQ=MONTHLY')) return 3;
  if (rule.includes('FREQ=QUARTERLY')) return 6;
  if (rule.includes('FREQ=YEARLY')) return 13;
  return 3; // safe default
}

/* ==================== Logic ==================== */

export const incomeLogic = {
  processSchedules: async () => {
    const schedules = await incomeCommitments.getSchedules();
    const today = startOfDay(new Date());

    for (const schedule of schedules) {
      if (!schedule.IsActive) continue;

      try {
        /* -------- 1. Collect processed dates -------- */

        const existingPending = await db.query<{ PlannedDate: string }>(
          'SELECT PlannedDate FROM PendingIncomes WHERE IncomeScheduleID = ?',
          [schedule.IncomeScheduleID]
        );

        const confirmedIncomes =
          await incomeCommitments.getConfirmedIncomesForSchedule(schedule);

        const processedDates = new Set<string>([
          ...existingPending.map(p => normalizeDateString(p.PlannedDate)),
          ...confirmedIncomes.map(c => normalizeDateString(c.TopUpDate))
        ]);

        /* -------- 2. Determine generation range -------- */

        const creationDate = startOfDay(
          parseISO(schedule.CreationTimestamp)
        );

        const lastKnownDate = Array.from(processedDates).reduce<Date>(
          (latest, current) => {
            const d = startOfDay(parseISO(current));
            return isAfter(d, latest) ? d : latest;
          },
          creationDate
        );

        const lookbackMonths = lookbackMonthsForRule(
          schedule.RecurrenceRule
        );

        const rangeStartDate = subMonths(lastKnownDate, lookbackMonths);

        const lookaheadDate = addDays(
          today,
          schedule.LookaheadDays ?? 0
        );

        /* -------- 3. Calculate occurrences -------- */

        const occurrences = calculateOccurrences(
          creationDate,
          schedule.RecurrenceRule,
          rangeStartDate,
          lookaheadDate
        ).slice(0, 500); // hard cap per schedule

        /* -------- 4. Process occurrences -------- */

        for (const occurrence of occurrences) {
          const dateStr = format(occurrence, 'yyyy-MM-dd');

          if (processedDates.has(dateStr)) continue;

          if (schedule.RequiresConfirmation) {
            await incomeCommitments.createPendingIncome({
              IncomeScheduleID: schedule.IncomeScheduleID,
              PlannedDate: dateStr,
              Amount: schedule.ExpectedAmount
            });
          } else if (!isAfter(occurrence, today)) {
            await incomeCommitments.createTopUpFromIncome({
              PaymentMethodID: schedule.PaymentMethodID,
              Amount: schedule.ExpectedAmount ?? 0,
              Date: dateStr,
              SourceName: schedule.SourceName,
              Category: schedule.Category
            });
          }

          processedDates.add(dateStr);
        }
      } catch (err) {
        console.error(
          `Failed processing IncomeScheduleID=${schedule.IncomeScheduleID}`,
          err
        );
        // Continue with next schedule
      }
    }
  },

  confirmPendingIncome: async (
    pending: any,
    actualAmount: number,
    actualDate: string
  ) => {
    const schedule = await db.queryOne<any>(
      `
      SELECT s.*, src.IncomeSourceName, cat.IncomeCategoryName
      FROM IncomeSchedules s
      JOIN IncomeSources src ON s.IncomeSourceID = src.IncomeSourceID
      LEFT JOIN IncomeCategories cat ON s.IncomeCategoryID = cat.IncomeCategoryID
      WHERE s.IncomeScheduleID = ?
    `,
      [pending.IncomeScheduleID]
    );

    if (!schedule) {
      throw new Error('Schedule not found for pending income.');
    }

    await incomeCommitments.createTopUpFromIncome({
      PaymentMethodID: schedule.PaymentMethodID,
      Amount: actualAmount,
      Date: normalizeDateString(actualDate),
      SourceName: schedule.IncomeSourceName,
      Category: schedule.IncomeCategoryName
    });

    await incomeCommitments.deletePendingIncome(
      pending.PendingIncomeID
    );
  },

  rejectPendingIncome: async (id: number) => {
    await incomeCommitments.deletePendingIncome(id);
  }
};