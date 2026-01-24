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
          'SELECT PlannedDate FROM SchedulesPending WHERE ScheduleID = ?',
          [schedule.ScheduleID]
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

        // Find the latest processed date to start generating from there
        // If no processed dates, start from creation date or 3 months ago (whichever is later)
        // Actually, we should calculate occurrences from the beginning (or a reasonable past) 
        // and filter out those already in processedDates.
        // But to optimize, we can start checking from the last processed date.
        
        // However, if we missed an occurrence in the past (e.g. app was closed), we need to catch it.
        // So we should look back a bit.
        
        let rangeStartDate = subMonths(today, 3); 
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
              ScheduleID: schedule.ScheduleID,
              PlannedDate: dateStr,
              Amount: schedule.ExpectedAmount
            });
          } else if (!isAfter(occurrence, today)) {
            if (schedule.Type === 'expense') {
               await incomeCommitments.createExpenseFromSchedule({
                 PaymentMethodID: schedule.PaymentMethodID,
                 Amount: schedule.ExpectedAmount ?? 0,
                 Date: dateStr,
                 Note: schedule.Note || schedule.SourceName,
                 VendorID: schedule.VendorID!,
                 ProductCategoryID: schedule.ProductCategoryID
               });
            } else {
              await incomeCommitments.createTopUpFromIncome({
                PaymentMethodID: schedule.PaymentMethodID,
                Amount: schedule.ExpectedAmount ?? 0,
                Date: dateStr,
                Note: schedule.Note || schedule.SourceName,
                IncomeSourceID: schedule.IncomeSourceID,
                IncomeCategoryID: schedule.IncomeCategoryID,
                EntityID: schedule.EntityID
              });
            }
          }

          processedDates.add(dateStr);
        }
      } catch (err) {
        console.error(
          `Failed processing ScheduleID=${schedule.ScheduleID}`,
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
      SELECT s.*, 
        CASE WHEN s.Type = 'expense' THEN st.VendorName ELSE src.IncomeSourceName END as SourceName
      FROM Schedules s
      LEFT JOIN IncomeSources src ON s.IncomeSourceID = src.IncomeSourceID
      LEFT JOIN Vendors st ON s.VendorID = st.VendorID
      WHERE s.ScheduleID = ?
    `,
      [pending.ScheduleID]
    );

    if (!schedule) {
      throw new Error('Schedule not found for pending income.');
    }

    if (schedule.Type === 'expense') {
      await incomeCommitments.createExpenseFromSchedule({
        PaymentMethodID: paymentMethodId,
        Amount: actualAmount,
        Date: normalizeDateString(actualDate),
        Note: schedule.Note || schedule.SourceName,
        VendorID: schedule.VendorID,
        ProductCategoryID: schedule.ProductCategoryID
      });
    } else {
      await incomeCommitments.createTopUpFromIncome({
        PaymentMethodID: paymentMethodId,
        Amount: actualAmount,
        Date: normalizeDateString(actualDate),
        Note: schedule.Note || schedule.SourceName,
        IncomeSourceID: schedule.IncomeSourceID,
        IncomeCategoryID: schedule.IncomeCategoryID,
        EntityID: schedule.EntityID
      });
    }

    await incomeCommitments.deletePendingIncome(
      pending.SchedulePendingID
    );
  },

  rejectPendingIncome: async (id: number) => {
    await incomeCommitments.deletePendingIncome(id);
  }
};
