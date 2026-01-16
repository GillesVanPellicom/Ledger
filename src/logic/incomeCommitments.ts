import { db } from '../utils/db';

/* ==================== Types ==================== */

export interface IncomeSchedule {
  IncomeScheduleID: number;
  SourceName: string;
  Category: string | null;
  PaymentMethodID: number;
  ExpectedAmount: number | null;
  RecurrenceRule: string;
  RequiresConfirmation: boolean;
  LookaheadDays: number | null;
  IsActive: boolean;
  CreationTimestamp: string;
}

export interface PendingIncome {
  PendingIncomeID: number;
  IncomeScheduleID: number | null;
  PlannedDate: string; // yyyy-MM-dd
  Amount: number | null;
  State: 'TO_CHECK';
  SourceName?: string;
  Category?: string;
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

/* ==================== Commitments ==================== */

export const incomeCommitments = {
  /* -------- Schedules -------- */

  getSchedules: async (): Promise<IncomeSchedule[]> => {
    const rows = await db.query<any>(`
      SELECT 
        s.*, 
        src.IncomeSourceName AS SourceName,
        cat.IncomeCategoryName AS Category
      FROM IncomeSchedules s
      JOIN IncomeSources src ON s.IncomeSourceID = src.IncomeSourceID
      LEFT JOIN IncomeCategories cat ON s.IncomeCategoryID = cat.IncomeCategoryID
      WHERE s.IsActive = 1
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
        src.IncomeSourceName AS SourceName,
        cat.IncomeCategoryName AS Category
      FROM PendingIncomes p
      JOIN IncomeSchedules s ON p.IncomeScheduleID = s.IncomeScheduleID
      JOIN IncomeSources src ON s.IncomeSourceID = src.IncomeSourceID
      LEFT JOIN IncomeCategories cat ON s.IncomeCategoryID = cat.IncomeCategoryID
      WHERE p.Status = 'pending'
      ORDER BY p.PlannedDate ASC
    `);
  },

  /* -------- Confirmed incomes -------- */

  getConfirmedIncomeTopUps: async (): Promise<any[]> => {
    return await db.query(`
      SELECT t.*, pm.PaymentMethodName
      FROM TopUps t
      JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
      WHERE t.TopUpNote LIKE '[Income]%'
      ORDER BY t.TopUpDate DESC
    `);
  },

  /**
   * NOTE:
   * This relies on TopUpNote text matching.
   * This is fragile and should eventually be replaced with a ScheduleID FK.
   */
  getConfirmedIncomesForSchedule: async (
    schedule: IncomeSchedule
  ): Promise<{ TopUpDate: string }[]> => {
    const notePrefix = `[Income] ${schedule.SourceName}`;
    return await db.query<{ TopUpDate: string }>(
      `
      SELECT TopUpDate
      FROM TopUps
      WHERE TopUpNote LIKE ?
    `,
      [`${notePrefix}%`]
    );
  },

  /* -------- Creation helpers -------- */

  createTopUpFromIncome: async (data: {
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
    SourceName: string;
    Category?: string | null;
  }) => {
    const note = `[Income] ${data.SourceName}${
      data.Category ? ` (${data.Category})` : ''
    }`;

    return await db.execute(
      `
      INSERT INTO TopUps (
        PaymentMethodID,
        TopUpAmount,
        TopUpDate,
        TopUpNote
      ) VALUES (?, ?, ?, ?)
    `,
      [data.PaymentMethodID, data.Amount, data.Date, note]
    );
  },

  createPendingIncome: async (data: {
    IncomeScheduleID: number;
    PlannedDate: string; // yyyy-MM-dd
    Amount: number | null;
  }) => {
    try {
      return await db.execute(
        `
        INSERT INTO PendingIncomes (
          IncomeScheduleID,
          PlannedDate,
          Amount,
          Status
        ) VALUES (?, ?, ?, 'pending')
      `,
        [data.IncomeScheduleID, data.PlannedDate, data.Amount]
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
      `DELETE FROM PendingIncomes WHERE PendingIncomeID = ?`,
      [id]
    );
  },

  /* -------- Schedule management -------- */

  createSchedule: async (data: any) => {
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

    return await db.execute(
      `
      INSERT INTO IncomeSchedules (
        IncomeSourceID,
        IncomeCategoryID,
        PaymentMethodID,
        ExpectedAmount,
        RecurrenceRule,
        RequiresConfirmation,
        LookaheadDays,
        IsActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `,
      [
        assertDefined(source?.IncomeSourceID, 'Income source not found'),
        category?.IncomeCategoryID ?? null,
        data.PaymentMethodID,
        data.ExpectedAmount,
        data.RecurrenceRule,
        data.RequiresConfirmation ? 1 : 0,
        data.LookaheadDays
      ]
    );
  },

  updateSchedule: async (id: number, data: any) => {
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

    return await db.execute(
      `
      UPDATE IncomeSchedules
      SET
        IncomeSourceID = ?,
        IncomeCategoryID = ?,
        PaymentMethodID = ?,
        ExpectedAmount = ?,
        RecurrenceRule = ?,
        RequiresConfirmation = ?,
        LookaheadDays = ?,
        IsActive = ?
      WHERE IncomeScheduleID = ?
    `,
      [
        assertDefined(source?.IncomeSourceID, 'Income source not found'),
        category?.IncomeCategoryID ?? null,
        data.PaymentMethodID,
        data.ExpectedAmount,
        data.RecurrenceRule,
        data.RequiresConfirmation ? 1 : 0,
        data.LookaheadDays,
        data.IsActive ? 1 : 0,
        id
      ]
    );
  },

  deleteSchedule: async (id: number, hardDelete: boolean) => {
    if (hardDelete) {
      return await db.execute(
        `DELETE FROM IncomeSchedules WHERE IncomeScheduleID = ?`,
        [id]
      );
    }

    return await db.execute(
      `UPDATE IncomeSchedules SET IsActive = 0 WHERE IncomeScheduleID = ?`,
      [id]
    );
  },

  /* -------- One-off income -------- */

  createOneTimeIncome: async (data: {
    SourceName: string;
    Category: string | null;
    PaymentMethodID: number;
    Amount: number;
    Date: string; // yyyy-MM-dd
  }) => {
    return await incomeCommitments.createTopUpFromIncome({
      PaymentMethodID: data.PaymentMethodID,
      Amount: data.Amount,
      Date: data.Date,
      SourceName: data.SourceName,
      Category: data.Category
    });
  }
};