import { db } from '../utils/db';
import { calculateOccurrences } from './incomeScheduling';
import { format, startOfToday, subMonths, parseISO, startOfDay } from 'date-fns';
import { useSettingsStore } from '../store/useSettingsStore';

/* ==================== Types ==================== */

export interface IncomeSchedule {
  ScheduleID: number;
  Type: 'income' | 'expense';
  IncomeSourceID: number | null;
  VendorID: number | null;
  EntityID: number | null;
  IncomeCategoryID: number | null;
  ProductCategoryID: number | null;
  SourceName: string;
  Category: string | null;
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
  SourceName?: string;
  Category?: string;
  PaymentMethodName?: string;
  PaymentMethodID?: number;
  Note?: string | null;
  IncomeSourceID?: number | null;
  VendorID?: number | null;
  IncomeCategoryID?: number | null;
  ProductCategoryID?: number | null;
  EntityID?: number | null;
}

/* ==================== Helpers ==================== */

function assertDefined<T>(
  value: T | null | undefined,
  message: string
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

function getCurrentDate(): Date {
  const settings = useSettingsStore.getState().settings;
  if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
    return startOfDay(parseISO(settings.dev.mockTime.date));
  }
  return startOfToday();
}

/* ==================== Commitments ==================== */

export const incomeCommitments = {
  /* -------- Schedules -------- */

  getSchedules: async (): Promise<IncomeSchedule[]> => {
    const rows = await db.query<any>(`
      SELECT 
        s.*, 
        CASE 
          WHEN s.Type = 'expense' THEN st.VendorName
          ELSE src.IncomeSourceName 
        END AS SourceName,
        CASE 
          WHEN s.Type = 'expense' THEN c.ProductCategoryName
          ELSE cat.IncomeCategoryName 
        END AS Category,
        pm.PaymentMethodName
      FROM Schedules s
      LEFT JOIN IncomeSources src ON s.IncomeSourceID = src.IncomeSourceID
      LEFT JOIN Vendors st ON s.VendorID = st.VendorID
      LEFT JOIN IncomeCategories cat ON s.IncomeCategoryID = cat.IncomeCategoryID
      LEFT JOIN ProductCategories c ON s.ProductCategoryID = c.ProductCategoryID
      LEFT JOIN PaymentMethods pm ON s.PaymentMethodID = pm.PaymentMethodID
    `);

    return rows.map(r => ({
      ...r,
      RequiresConfirmation: Boolean(r.RequiresConfirmation),
      IsActive: Boolean(r.IsActive)
    }));
  },

  /* -------- Pending incomes -------- */

  getPendingIncomes: async (): Promise<
    (PendingIncome & { SourceName: string })[]
  > => {
    return await db.query<any>(`
      SELECT 
        p.*, 
        s.Type,
        CASE 
          WHEN s.Type = 'expense' THEN st.VendorName
          ELSE src.IncomeSourceName 
        END AS SourceName,
        CASE 
          WHEN s.Type = 'expense' THEN c.ProductCategoryName
          ELSE cat.IncomeCategoryName 
        END AS Category,
        pm.PaymentMethodName,
        s.PaymentMethodID,
        s.Note,
        s.IncomeSourceID,
        s.VendorID,
        s.IncomeCategoryID,
        s.ProductCategoryID,
        s.EntityID
      FROM SchedulesPending p
      JOIN Schedules s ON p.ScheduleID = s.ScheduleID
      LEFT JOIN IncomeSources src ON s.IncomeSourceID = src.IncomeSourceID
      LEFT JOIN Vendors st ON s.VendorID = st.VendorID
      LEFT JOIN IncomeCategories cat ON s.IncomeCategoryID = cat.IncomeCategoryID
      LEFT JOIN ProductCategories c ON s.ProductCategoryID = c.ProductCategoryID
      LEFT JOIN PaymentMethods pm ON s.PaymentMethodID = pm.PaymentMethodID
      WHERE p.Status = 'pending'
      ORDER BY p.PlannedDate ASC
    `);
  },

  /* -------- Confirmed incomes -------- */

  getConfirmedIncomeTopUps: async (): Promise<any[]> => {
    return await db.query(`
      SELECT t.*, pm.PaymentMethodName, src.IncomeSourceName as SourceName
      FROM Income t
      LEFT JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
      LEFT JOIN IncomeSources src ON t.IncomeSourceID = src.IncomeSourceID
      WHERE t.IncomeNote NOT LIKE 'Repayment from %'
      ORDER BY t.IncomeDate DESC
    `);
  },

  getDebtRepayments: async (): Promise<any[]> => {
    const [paidToMe, paidByMe] = await Promise.all([
      db.query<any>(`
        SELECT 
          rdp.PaidDate,
          d.EntityID as DebtorID,
          d.EntityName as DebtorName,
          pm.PaymentMethodName,
          t.IncomeAmount as TopUpAmount,
          t.PaymentMethodID,
          rdp.ExpenseID as ReceiptID
        FROM ExpenseEntityPayments rdp
        JOIN Entities d ON rdp.EntityID = d.EntityID
        JOIN Income t ON rdp.IncomeID = t.IncomeID
        JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
        ORDER BY rdp.PaidDate DESC
      `),
      db.query<any>(`
        SELECT
          r.ExpenseDate as PaidDate,
          d.EntityID as DebtorID,
          d.EntityName as DebtorName,
          pm.PaymentMethodName,
          r.NonItemisedTotal as TopUpAmount,
          r.PaymentMethodID,
          r.ExpenseID as ReceiptID
        FROM Expenses r
        JOIN Entities d ON r.OwedToEntityID = d.EntityID
        JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
        WHERE r.Status = 'paid' AND r.OwedToEntityID IS NOT NULL
        ORDER BY r.ExpenseDate DESC
      `)
    ]);

    return [...paidToMe, ...paidByMe].sort((a, b) => new Date(b.PaidDate).getTime() - new Date(a.PaidDate).getTime());
  },

  /**
   * NOTE:
   * This relies on TopUpNote text matching.
   * This is fragile and should eventually be replaced with a ScheduleID FK.
   */
  getConfirmedIncomesForSchedule: async (
    schedule: IncomeSchedule
  ): Promise<{ TopUpDate: string }[]> => {
    if (schedule.Type === 'expense') {
      // For expenses, we check Receipts table
      // Assuming non-itemised receipts for scheduled expenses
      return await db.query<{ TopUpDate: string }>(`
        SELECT ExpenseDate as TopUpDate
        FROM Expenses
        WHERE VendorID = ?
          AND PaymentMethodID = ?
          AND IsNonItemised = 1
          AND ABS(NonItemisedTotal - ?) < 0.01
      `, [schedule.VendorID, schedule.PaymentMethodID, schedule.ExpectedAmount]);
    } else {
      return await db.query<{ TopUpDate: string }>(
        `
        SELECT IncomeDate as TopUpDate
        FROM Income
        WHERE IncomeSourceID = ? 
          AND (IncomeCategoryID = ? OR (IncomeCategoryID IS NULL AND ? IS NULL))
          AND (EntityID = ? OR (EntityID IS NULL AND ? IS NULL))
      `,
        [
          schedule.IncomeSourceID, 
          schedule.IncomeCategoryID, schedule.IncomeCategoryID,
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
    IncomeSourceID?: number | null;
    IncomeCategoryID?: number | null;
    EntityID?: number | null;
  }) => {
    return await db.execute(
      `
      INSERT INTO Income (
        PaymentMethodID,
        IncomeAmount,
        IncomeDate,
        IncomeNote,
        IncomeSourceID,
        IncomeCategoryID,
        EntityID
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.PaymentMethodID, 
        data.Amount, 
        data.Date, 
        data.Note, 
        data.IncomeSourceID || null, 
        data.IncomeCategoryID || null,
        data.EntityID || null
      ]
    );
  },

  createExpenseFromSchedule: async (data: {
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
    Note: string;
    VendorID: number;
    ProductCategoryID?: number | null;
  }) => {
    // Create a non-itemised receipt
    return await db.execute(
      `
      INSERT INTO Expenses (
        VendorID,
        ExpenseDate,
        ExpenseNote,
        PaymentMethodID,
        Status,
        IsNonItemised,
        NonItemisedTotal,
        IsTentative
      ) VALUES (?, ?, ?, ?, 'paid', 1, ?, 0)
      `,
      [
        data.VendorID,
        data.Date,
        data.Note,
        data.PaymentMethodID,
        data.Amount
      ]
    );
    // Note: CategoryID is not directly on Receipts, it's usually on Products.
    // For non-itemised receipts, we don't have a direct category link in the current schema unless we add it or use a dummy line item.
    // However, the prompt implies we should just create the expense.
    // If we want to track category, we might need to insert a dummy line item or just ignore it for now as Receipts don't have CategoryID.
    // Let's assume for now we just create the receipt.
  },

  createPendingIncome: async (data: {
    ScheduleID: number;
    PlannedDate: string; // yyyy-MM-dd
    Amount: number | null;
  }) => {
    try {
      return await db.execute(
        `
        INSERT INTO SchedulesPending (
          ScheduleID,
          PlannedDate,
          Amount,
          Status
        ) VALUES (?, ?, ?, 'pending')
      `,
        [data.ScheduleID, data.PlannedDate, data.Amount]
      );
    } catch (err: any) {
      // Assume unique constraint violation → idempotent behavior
      if (err?.code === 'SQLITE_CONSTRAINT') {
        return;
      }
      throw err;
    }
  },

  deletePendingIncome: async (id: number) => {
    return await db.execute(
      `DELETE FROM SchedulesPending WHERE SchedulePendingID = ?`,
      [id]
    );
  },

  /* -------- Schedule management -------- */

  createSchedule: async (data: any) => {
    const type = data.Type || 'income';
    let sourceId = null;
    let vendorId = null;
    let categoryId = null;
    let incomeCategoryId = null;
    let entityId = null;

    if (type === 'income') {
      const source = await db.queryOne<{ IncomeSourceID: number }>(
        `SELECT IncomeSourceID FROM IncomeSources WHERE IncomeSourceName = ?`,
        [data.SourceName]
      );
      sourceId = assertDefined(source?.IncomeSourceID, 'Income source not found');

      if (data.Category) {
        const category = await db.queryOne<{ IncomeCategoryID: number }>(
          `SELECT IncomeCategoryID FROM IncomeCategories WHERE IncomeCategoryName = ?`,
          [data.Category]
        );
        incomeCategoryId = category?.IncomeCategoryID ?? null;
      }

      if (data.DebtorName) {
        const debtor = await db.queryOne<{ EntityID: number }>(
          `SELECT EntityID FROM Entities WHERE EntityName = ?`,
          [data.DebtorName]
        );
        entityId = debtor?.EntityID ?? null;
      }
    } else {
      // Expense
      const store = await db.queryOne<{ VendorID: number }>(
        `SELECT VendorID FROM Vendors WHERE VendorName = ?`,
        [data.SourceName] // SourceName holds StoreName for expenses in the UI form
      );
      vendorId = assertDefined(store?.VendorID, 'Store not found');

      if (data.Category) {
        // Assuming general Categories table for expenses
        // We might need to look up by name or create if not exists? 
        // For now assume it exists or we pass ID. The UI passes name.
        // Let's try to find it.
        const category = await db.queryOne<{ ProductCategoryID: number }>(
            `SELECT ProductCategoryID FROM ProductCategories WHERE ProductCategoryName = ?`,
            [data.Category]
        );
        categoryId = category?.ProductCategoryID ?? null;
      }
    }

    const result = await db.execute(
      `
      INSERT INTO Schedules (
        Type,
        IncomeSourceID,
        VendorID,
        EntityID,
        IncomeCategoryID,
        ProductCategoryID,
        PaymentMethodID,
        ExpectedAmount,
        RecurrenceRule,
        DayOfMonth,
        DayOfWeek,
        MonthOfYear,
        RequiresConfirmation,
        LookaheadDays,
        IsActive,
        Note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `,
      [
        type,
        sourceId,
        vendorId,
        entityId,
        incomeCategoryId,
        categoryId,
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
        `SELECT * FROM Schedules WHERE ScheduleID = ?`,
        [newScheduleId]
      );
      if (schedule) {
        const today = getCurrentDate();
        const occurrences = calculateOccurrences(schedule, subMonths(today, 1), today);
        if (occurrences.length > 0) {
          await incomeCommitments.createPendingIncome({
            ScheduleID: newScheduleId,
            PlannedDate: format(occurrences[0], 'yyyy-MM-dd'),
            Amount: schedule.ExpectedAmount
          });
        }
      }
    }

    return result;
  },

  updateSchedule: async (id: number, data: any) => {
    const type = data.Type || 'income';
    let sourceId = null;
    let vendorId = null;
    let categoryId = null;
    let incomeCategoryId = null;
    let entityId = null;

    if (type === 'income') {
      const source = await db.queryOne<{ IncomeSourceID: number }>(
        `SELECT IncomeSourceID FROM IncomeSources WHERE IncomeSourceName = ?`,
        [data.SourceName]
      );
      sourceId = assertDefined(source?.IncomeSourceID, 'Income source not found');

      if (data.Category) {
        const category = await db.queryOne<{ IncomeCategoryID: number }>(
          `SELECT IncomeCategoryID FROM IncomeCategories WHERE IncomeCategoryName = ?`,
          [data.Category]
        );
        incomeCategoryId = category?.IncomeCategoryID ?? null;
      }

      if (data.DebtorName) {
        const debtor = await db.queryOne<{ EntityID: number }>(
          `SELECT EntityID FROM Entities WHERE EntityName = ?`,
          [data.DebtorName]
        );
        entityId = debtor?.EntityID ?? null;
      }
    } else {
      const store = await db.queryOne<{ VendorID: number }>(
        `SELECT VendorID FROM Vendors WHERE VendorName = ?`,
        [data.SourceName]
      );
      vendorId = assertDefined(store?.VendorID, 'Store not found');

      if (data.Category) {
        const category = await db.queryOne<{ ProductCategoryID: number }>(
            `SELECT ProductCategoryID FROM ProductCategories WHERE ProductCategoryName = ?`,
            [data.Category]
        );
        categoryId = category?.ProductCategoryID ?? null;
      }
    }

    return await db.execute(
      `
      UPDATE Schedules
      SET
        Type = ?,
        IncomeSourceID = ?,
        VendorID = ?,
        EntityID = ?,
        IncomeCategoryID = ?,
        ProductCategoryID = ?,
        PaymentMethodID = ?,
        ExpectedAmount = ?,
        RecurrenceRule = ?,
        DayOfMonth = ?,
        DayOfWeek = ?,
        MonthOfYear = ?,
        RequiresConfirmation = ?,
        LookaheadDays = ?,
        IsActive = ?,
        Note = ?
      WHERE ScheduleID = ?
    `,
      [
        type,
        sourceId,
        vendorId,
        entityId,
        incomeCategoryId,
        categoryId,
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
        `DELETE FROM SchedulesPending WHERE ScheduleID = ?`,
        [id]
      );
    }

    return await db.execute(
      `UPDATE Schedules SET IsActive = 0 WHERE ScheduleID = ?`,
      [id]
    );
  },

  /* -------- One-off income -------- */

  createOneTimeIncome: async (data: {
    SourceName: string;
    Category: string | null;
    DebtorName?: string | null;
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
    Note: string;
  }) => {
    const source = await db.queryOne<{ IncomeSourceID: number }>(
      `SELECT IncomeSourceID FROM IncomeSources WHERE IncomeSourceName = ?`,
      [data.SourceName]
    );

    const category = data.Category
      ? await db.queryOne<{ IncomeCategoryID: number }>(
          `SELECT IncomeCategoryID FROM IncomeCategories WHERE IncomeCategoryName = ?`,
          [data.Category]
        )
      : null;

    const debtor = data.DebtorName
      ? await db.queryOne<{ EntityID: number }>(
          `SELECT EntityID FROM Entities WHERE EntityName = ?`,
          [data.DebtorName]
        )
      : null;

    return await incomeCommitments.createTopUpFromIncome({
      PaymentMethodID: data.PaymentMethodID,
      Amount: data.Amount,
      Date: data.Date,
      Note: data.Note,
      IncomeSourceID: source?.IncomeSourceID,
      IncomeCategoryID: category?.IncomeCategoryID,
      EntityID: debtor?.EntityID
    });
  }
};
