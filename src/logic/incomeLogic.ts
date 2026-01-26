import {
  format,
  addDays,
  startOfDay,
  parseISO,
  isAfter,
  subMonths,
  isBefore
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
    const rangeStartDateGlobal = subMonths(today, 3);

    // 1. Fetch all pending incomes in one go
    const allPending = await db.query<{ ScheduleID: number; PlannedDate: string }>(
      'SELECT ScheduleID, PlannedDate FROM SchedulesPending'
    );
    const pendingMap = new Map<number, Set<string>>();
    allPending.forEach(p => {
      if (!pendingMap.has(p.ScheduleID)) pendingMap.set(p.ScheduleID, new Set());
      pendingMap.get(p.ScheduleID)!.add(normalizeDateString(p.PlannedDate));
    });

    // 2. Fetch all confirmed incomes/expenses in the range to match against schedules
    const [allConfirmedExpenses, allConfirmedIncomes] = await Promise.all([
      db.query<any>(
        'SELECT RecipientID, PaymentMethodID, NonItemisedTotal, ExpenseDate FROM Expenses WHERE IsNonItemised = 1 AND ExpenseDate >= ?',
        [format(rangeStartDateGlobal, 'yyyy-MM-dd')]
      ),
      db.query<any>(
        'SELECT RecipientID, CategoryID, EntityID, IncomeDate FROM Income WHERE IncomeDate >= ?',
        [format(rangeStartDateGlobal, 'yyyy-MM-dd')]
      )
    ]);

    const pendingCreations: any[] = [];
    const expenseCreations: any[] = [];
    const incomeCreations: any[] = [];

    for (const schedule of schedules) {
      if (!schedule.IsActive) continue;

      try {
        /* -------- 1. Collect processed dates -------- */
        const processedDates = new Set<string>(pendingMap.get(schedule.ScheduleID) || []);

        if (schedule.Type === 'expense') {
          allConfirmedExpenses
            .filter(e => 
              e.RecipientID === schedule.RecipientID && 
              e.PaymentMethodID === schedule.PaymentMethodID && 
              Math.abs(e.NonItemisedTotal - (schedule.ExpectedAmount || 0)) < 0.01
            )
            .forEach(e => processedDates.add(normalizeDateString(e.ExpenseDate)));
        } else {
          allConfirmedIncomes
            .filter(i => 
              i.RecipientID === schedule.RecipientID && 
              (i.CategoryID === schedule.CategoryID || (i.CategoryID === null && schedule.CategoryID === null)) &&
              (i.EntityID === schedule.EntityID || (i.EntityID === null && schedule.EntityID === null))
            )
            .forEach(i => processedDates.add(normalizeDateString(i.IncomeDate)));
        }

        /* -------- 2. Determine generation range -------- */
        const creationDate = startOfDay(parseISO(schedule.CreationTimestamp));
        let rangeStartDate = rangeStartDateGlobal;
        if (isBefore(rangeStartDate, creationDate)) {
          rangeStartDate = creationDate;
        }

        const lookaheadDate = addDays(today, schedule.LookaheadDays ?? 0);

        /* -------- 3. Calculate occurrences -------- */
        const occurrences = calculateOccurrences(
          schedule as any,
          rangeStartDate,
          lookaheadDate
        ).slice(0, 500);

        /* -------- 4. Process occurrences -------- */
        for (const occurrence of occurrences) {
          const dateStr = format(occurrence, 'yyyy-MM-dd');
          if (processedDates.has(dateStr)) continue;

          if (schedule.RequiresConfirmation) {
            pendingCreations.push({
              ScheduleID: schedule.ScheduleID,
              PlannedDate: dateStr,
              Amount: schedule.ExpectedAmount
            });
          } else if (!isAfter(occurrence, today)) {
            if (schedule.Type === 'expense') {
              expenseCreations.push({
                RecipientID: schedule.RecipientID,
                ExpenseDate: dateStr,
                ExpenseNote: schedule.Note || schedule.RecipientName,
                PaymentMethodID: schedule.PaymentMethodID,
                NonItemisedTotal: schedule.ExpectedAmount ?? 0
              });
            } else {
              incomeCreations.push({
                PaymentMethodID: schedule.PaymentMethodID,
                IncomeAmount: schedule.ExpectedAmount ?? 0,
                IncomeDate: dateStr,
                IncomeNote: schedule.Note || schedule.RecipientName,
                RecipientID: schedule.RecipientID,
                CategoryID: schedule.CategoryID,
                EntityID: schedule.EntityID
              });
            }
          }
          processedDates.add(dateStr);
        }
      } catch (err) {
        console.error(`Failed processing ScheduleID=${schedule.ScheduleID}`, err);
      }
    }

    // 5. Batch insertions
    if (pendingCreations.length > 0) {
      for (const p of pendingCreations) {
        await incomeCommitments.createPendingIncome(p);
      }
    }

    if (expenseCreations.length > 0) {
      for (const e of expenseCreations) {
        await db.execute(
          `INSERT INTO Expenses (RecipientID, ExpenseDate, ExpenseNote, PaymentMethodID, Status, IsNonItemised, NonItemisedTotal, IsTentative) 
           VALUES (?, ?, ?, ?, 'paid', 1, ?, 0)`,
          [e.RecipientID, e.ExpenseDate, e.ExpenseNote, e.PaymentMethodID, e.NonItemisedTotal]
        );
      }
    }

    if (incomeCreations.length > 0) {
      for (const i of incomeCreations) {
        await db.execute(
          `INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote, RecipientID, CategoryID, EntityID) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [i.PaymentMethodID, i.IncomeAmount, i.IncomeDate, i.IncomeNote, i.RecipientID, i.CategoryID, i.EntityID]
        );
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
      SELECT s.*, src.EntityName as RecipientName
      FROM Schedules s
      LEFT JOIN Entities src ON s.RecipientID = src.EntityID
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
        Note: schedule.Note || schedule.RecipientName,
        RecipientID: schedule.RecipientID,
        CategoryID: schedule.CategoryID
      });
    } else {
      await incomeCommitments.createTopUpFromIncome({
        PaymentMethodID: paymentMethodId,
        Amount: actualAmount,
        Date: normalizeDateString(actualDate),
        Note: schedule.Note || schedule.RecipientName,
        RecipientID: schedule.RecipientID,
        CategoryID: schedule.CategoryID,
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
