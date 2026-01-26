import {db} from '../utils/db';
import {calculateOccurrences} from './incomeScheduling';
import {format, startOfToday, subMonths, parseISO, startOfDay} from 'date-fns';
import {useSettingsStore} from '../store/useSettingsStore';

/* ==================== Types ==================== */

export interface IncomeSchedule {
  ScheduleID: number;
  Type: 'income' | 'expense';
  RecipientID: number | null;
  EntityID: number | null;
  CategoryID: number | null;
  RecipientName: string;
  CategoryName: string | null;
  PaymentMethodID: number;
  PaymentMethodName: string;
  ExpectedAmount: number | null;
  RecurrenceRule: string;
  DayOfMonth: number | null;
  DayOfWeek: number | null;
  MonthOfYear: number | null;
  RequiresConfirmation: boolean;
  LookaheadDays: number | null;
  IsActive: boolean;
  CreationTimestamp: string;
  Note: string | null;
}

export interface PendingIncome {
  SchedulePendingID: number;
  ScheduleID: number | null;
  PlannedDate: string; // yyyy-MM-dd
  Amount: number | null;
  Status: 'pending' | 'confirmed' | 'rejected';
  Type: 'income' | 'expense';
  RecipientName?: string;
  CategoryName?: string;
  PaymentMethodName?: string;
  PaymentMethodID?: number;
  Note?: string | null;
  RecipientID?: number | null;
  CategoryID?: number | null;
  EntityID?: number | null;
}

/* ==================== Helpers ==================== */

/**
 * Normalizes a date to yyyy-MM-dd string.
 */
function normalizeDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(startOfDay(d), 'yyyy-MM-dd');
}

function getCurrentDate(): Date {
  const settings = useSettingsStore.getState().settings;
  if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
    return startOfDay(parseISO(settings.dev.mockTime.date));
  }
  return startOfToday();
}

/**
 * Maps raw database row to IncomeSchedule type.
 */
function mapScheduleRow(r: any): IncomeSchedule {
  return {
    ...r,
    RequiresConfirmation: Boolean(r.RequiresConfirmation),
    IsActive: Boolean(r.IsActive)
  };
}

/* ==================== Commitments ==================== */

export const incomeCommitments = {
  /* -------- Schedules -------- */

  getSchedules: async (): Promise<IncomeSchedule[]> => {
    const rows = await db.query<any>(`
        SELECT s.ScheduleID,
               s.Type,
               s.RecipientID,
               s.EntityID,
               s.CategoryID,
               s.PaymentMethodID,
               s.ExpectedAmount,
               s.RecurrenceRule,
               s.DayOfMonth,
               s.DayOfWeek,
               s.MonthOfYear,
               s.RequiresConfirmation,
               s.LookaheadDays,
               s.IsActive,
               s.CreationTimestamp,
               s.Note,
               src.EntityName   AS RecipientName,
               cat.CategoryName AS CategoryName,
               pm.PaymentMethodName
        FROM Schedules s
                 LEFT JOIN Entities src ON s.RecipientID = src.EntityID
                 LEFT JOIN Categories cat ON s.CategoryID = cat.CategoryID
                 LEFT JOIN PaymentMethods pm ON s.PaymentMethodID = pm.PaymentMethodID
    `);

    return rows.map(mapScheduleRow);
  },

  /* -------- Pending incomes -------- */

  getPendingIncomes: async (): Promise<
    (PendingIncome & { RecipientName: string })[]
  > => {
    return await db.query<any>(`
        SELECT p.SchedulePendingID,
               p.ScheduleID,
               p.PlannedDate,
               p.Amount,
               p.Status,
               s.Type,
               src.EntityName   AS RecipientName,
               cat.CategoryName AS CategoryName,
               pm.PaymentMethodName,
               s.PaymentMethodID,
               s.Note,
               s.RecipientID,
               s.CategoryID,
               s.EntityID
        FROM SchedulesPending p
                 JOIN Schedules s ON p.ScheduleID = s.ScheduleID
                 LEFT JOIN Entities src ON s.RecipientID = src.EntityID
                 LEFT JOIN Categories cat ON s.CategoryID = cat.CategoryID
                 LEFT JOIN PaymentMethods pm ON s.PaymentMethodID = pm.PaymentMethodID
        WHERE p.Status = 'pending'
        ORDER BY p.PlannedDate ASC
    `);
  },

  /* -------- Confirmed incomes -------- */

  getConfirmedIncomeTopUps: async (): Promise<any[]> => {
    return await db.query(`
        SELECT t.*, pm.PaymentMethodName, src.EntityName as RecipientName
        FROM Income t
                 LEFT JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
                 LEFT JOIN Entities src ON t.RecipientID = src.EntityID
        WHERE t.IncomeNote NOT LIKE 'Repayment from %'
        ORDER BY t.IncomeDate DESC
    `);
  },

  getDebtRepayments: async (): Promise<any[]> => {
    const [paidToMe, paidByMe] = await Promise.all([
      db.query<any>(`
          SELECT rdp.PaidDate,
                 d.EntityID     as DebtorID,
                 d.EntityName   as DebtorName,
                 pm.PaymentMethodName,
                 t.IncomeAmount as TopUpAmount,
                 t.PaymentMethodID,
                 rdp.ExpenseID  as ReceiptID
          FROM ExpenseEntityPayments rdp
                   JOIN Entities d ON rdp.EntityID = d.EntityID
                   JOIN Income t ON rdp.IncomeID = t.IncomeID
                   JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
          ORDER BY rdp.PaidDate DESC
      `),
      db.query<any>(`
          SELECT r.ExpenseDate      as PaidDate,
                 d.EntityID         as DebtorID,
                 d.EntityName       as DebtorName,
                 pm.PaymentMethodName,
                 r.NonItemisedTotal as TopUpAmount,
                 r.PaymentMethodID,
                 r.ExpenseID        as ReceiptID
          FROM Expenses r
                   JOIN Entities d ON r.OwedToEntityID = d.EntityID
                   JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
          WHERE r.Status = 'paid'
            AND r.OwedToEntityID IS NOT NULL
          ORDER BY r.ExpenseDate DESC
      `)
    ]);

    return [...paidToMe, ...paidByMe].sort((a, b) => new Date(b.PaidDate).getTime() - new Date(a.PaidDate).getTime());
  },

  getConfirmedIncomesForSchedule: async (
    schedule: IncomeSchedule
  ): Promise<{ TopUpDate: string }[]> => {
    if (schedule.Type === 'expense') {
      return await db.query<{ TopUpDate: string }>(`
          SELECT ExpenseDate as TopUpDate
          FROM Expenses
          WHERE RecipientID = ?
            AND PaymentMethodID = ?
            AND IsNonItemised = 1
            AND ABS(NonItemisedTotal - ?) < 0.01
      `, [schedule.RecipientID, schedule.PaymentMethodID, schedule.ExpectedAmount]);
    } else {
      return await db.query<{ TopUpDate: string }>(
        `
            SELECT IncomeDate as TopUpDate
            FROM Income
            WHERE RecipientID = ?
              AND (CategoryID = ? OR (CategoryID IS NULL AND ? IS NULL))
              AND (EntityID = ? OR (EntityID IS NULL AND ? IS NULL))
        `,
        [
          schedule.RecipientID,
          schedule.CategoryID, schedule.CategoryID,
          schedule.EntityID, schedule.EntityID
        ]
      );
    }
  },

  /* -------- Creation helpers -------- */

  createTopUpFromIncome: async (data: {
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
    Note: string;
    RecipientID?: number | null;
    CategoryID?: number | null;
    EntityID?: number | null;
  }) => {
    return await db.execute(
      `
          INSERT INTO Income (PaymentMethodID,
                              IncomeAmount,
                              IncomeDate,
                              IncomeNote,
                              RecipientID,
                              CategoryID,
                              EntityID)
          VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.PaymentMethodID,
        data.Amount,
        normalizeDate(data.Date),
        data.Note,
        data.RecipientID || null,
        data.CategoryID || null,
        data.EntityID || null
      ]
    );
  },

  createExpenseFromSchedule: async (data: {
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
    Note: string;
    RecipientID: number;
    CategoryID?: number | null;
  }) => {
    return await db.execute(
      `
          INSERT INTO Expenses (RecipientID,
                                ExpenseDate,
                                ExpenseNote,
                                PaymentMethodID,
                                Status,
                                IsNonItemised,
                                NonItemisedTotal,
                                IsTentative)
          VALUES (?, ?, ?, ?, 'paid', 1, ?, 0)
      `,
      [
        data.RecipientID,
        normalizeDate(data.Date),
        data.Note,
        data.PaymentMethodID,
        data.Amount
      ]
    );
  },

  createPendingIncome: async (data: {
    ScheduleID: number;
    PlannedDate: string; // yyyy-MM-dd
    Amount: number | null;
  }) => {
    try {
      return await db.execute(
        `
            INSERT INTO SchedulesPending (ScheduleID,
                                          PlannedDate,
                                          Amount,
                                          Status)
            VALUES (?, ?, ?, 'pending')
        `,
        [data.ScheduleID, normalizeDate(data.PlannedDate), data.Amount]
      );
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT') {
        return;
      }
      throw err;
    }
  },

  deletePendingIncome: async (id: number) => {
    return await db.execute(
      `DELETE
       FROM SchedulesPending
       WHERE SchedulePendingID = ?`,
      [id]
    );
  },

  /* -------- Schedule management -------- */

  createSchedule: async (data: any) => {
    const result = await db.execute(
      `
          INSERT INTO Schedules (Type,
                                 RecipientID,
                                 EntityID,
                                 CategoryID,
                                 PaymentMethodID,
                                 ExpectedAmount,
                                 RecurrenceRule,
                                 DayOfMonth,
                                 DayOfWeek,
                                 MonthOfYear,
                                 RequiresConfirmation,
                                 LookaheadDays,
                                 IsActive,
                                 Note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `,
      [
        data.Type || 'income',
        data.RecipientID,
        data.EntityID || null,
        data.CategoryID || null,
        data.PaymentMethodID,
        data.ExpectedAmount,
        data.RecurrenceRule,
        data.DayOfMonth,
        data.DayOfWeek,
        data.MonthOfYear,
        data.RequiresConfirmation ? 1 : 0,
        data.LookaheadDays,
        data.Note
      ]
    );

    const newScheduleId = result.lastInsertId;

    if (data.CreateForPastPeriod) {
      const schedule = await db.queryOne<IncomeSchedule>(
        `SELECT *
         FROM Schedules
         WHERE ScheduleID = ?`,
        [newScheduleId]
      );
      if (schedule) {
        const today = getCurrentDate();
        const occurrences = calculateOccurrences(mapScheduleRow(schedule), subMonths(today, 1), today);
        if (occurrences.length > 0) {
          await incomeCommitments.createPendingIncome({
            ScheduleID: newScheduleId,
            PlannedDate: normalizeDate(occurrences[0]),
            Amount: schedule.ExpectedAmount
          });
        }
      }
    }

    return result;
  },

  updateSchedule: async (id: number, data: any) => {
    return await db.execute(
      `
          UPDATE Schedules
          SET Type                 = ?,
              RecipientID          = ?,
              EntityID             = ?,
              CategoryID           = ?,
              PaymentMethodID      = ?,
              ExpectedAmount       = ?,
              RecurrenceRule       = ?,
              DayOfMonth           = ?,
              DayOfWeek            = ?,
              MonthOfYear          = ?,
              RequiresConfirmation = ?,
              LookaheadDays        = ?,
              IsActive             = ?,
              Note                 = ?
          WHERE ScheduleID = ?
      `,
      [
        data.Type || 'income',
        data.RecipientID,
        data.EntityID || null,
        data.CategoryID || null,
        data.PaymentMethodID,
        data.ExpectedAmount,
        data.RecurrenceRule,
        data.DayOfMonth,
        data.DayOfWeek,
        data.MonthOfYear,
        data.RequiresConfirmation ? 1 : 0,
        data.LookaheadDays,
        data.IsActive ? 1 : 0,
        data.Note,
        id
      ]
    );
  },

  deleteSchedule: async (id: number, hardDelete: boolean) => {
    if (hardDelete) {
      await db.execute(
        `DELETE
         FROM SchedulesPending
         WHERE ScheduleID = ?`,
        [id]
      );
    }

    return await db.execute(
      `UPDATE Schedules
       SET IsActive = 0
       WHERE ScheduleID = ?`,
      [id]
    );
  },

  /* -------- One-off income -------- */

  createOneTimeIncome: async (data: {
    RecipientID: number;
    CategoryID: number | null;
    EntityID?: number | null;
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
    Note: string;
  }) => {
    return await incomeCommitments.createTopUpFromIncome({
      PaymentMethodID: data.PaymentMethodID,
      Amount: data.Amount,
      Date: data.Date,
      Note: data.Note,
      RecipientID: data.RecipientID,
      CategoryID: data.CategoryID,
      EntityID: data.EntityID
    });
  }
};
