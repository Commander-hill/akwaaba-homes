import { Request, Response } from 'express';
/**
 * Log a new Property Operating Expense
 */
export declare const createExpense: (req: Request, res: Response) => Promise<void>;
/**
 * Get Landlord Expenses with Filtering
 */
export declare const getExpenses: (req: Request, res: Response) => Promise<void>;
/**
 * Delete an Expense Record
 */
export declare const deleteExpense: (req: Request, res: Response) => Promise<void>;
/**
 * Comprehensive P&L Financial Summary
 */
export declare const getFinancialAnalytics: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=expense.controller.d.ts.map