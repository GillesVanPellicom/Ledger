import {
  format,
  addDays,
  startOfDay,
  parseISO,
  isAfter,
  subMonths,
  isBefore,
  startOfToday
} from 'date-fns';

import { incomeCommitments } from './incomeCommitments';
import { calculateOccurrences } from './incomeScheduling';
import { db } from '../utils/db';
import { useSettingsStore } from '../store/useSettingsStore';

/* ==================== Helpers ==================== */

function normalizeDateString(date: string): string {
  return format(startOfDay(parseISO(date)), 'yyyy-MM-dd');
}

function getCurrentDate(): Date {
  const settings = useSettingsStore.getState().settings;
  if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
    return startOfDay(parseISO(settings.dev.mockTime.date));
  }
  return startOfDay(new Date());
}

/* ==================== Logic ==================== */

export const incomeLogic = {
  processSchedules: async () => {
    const schedules = await incomeCommitments.getSchedules();
    const today = getCurrentDate();

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
        
        let rangeStartDate = subMonths(lastKnownDate, 3); // Look back 3 months
        
        if (isBefore(rangeStartDate, creationDate)) {
          rangeStartDate = creationDate;
        }

        const lookaheadDate = addDays(
          today,
          schedule.LookaheadDays ?? 0
        );

        /* -------- 3. Calculate occurrences -------- */

        const occurrences = calculateOccurrences(
          schedule,
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
              Note: schedule.Note || schedule.SourceName,
              IncomeSourceID: schedule.IncomeSourceID,
              IncomeCategoryID: schedule.IncomeCategoryID
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
    actualDate: string,
    paymentMethodId: number
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
      PaymentMethodID: paymentMethodId,
      Amount: actualAmount,
      Date: normalizeDateString(actualDate),
      Note: schedule.Note || schedule.IncomeSourceName,
      IncomeSourceID: schedule.IncomeSourceID,
      IncomeCategoryID: schedule.IncomeCategoryID
    });

    await incomeCommitments.deletePendingIncome(
      pending.PendingIncomeID
    );
  },

  rejectPendingIncome: async (id: number) => {
    await incomeCommitments.deletePendingIncome(id);
  }
};