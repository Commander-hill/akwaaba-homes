import { Request, Response } from 'express';
export declare const createTicket: (req: Request, res: Response) => Promise<void>;
export declare const getTenantTickets: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordTickets: (req: Request, res: Response) => Promise<void>;
export declare const updateTicketStatus: (req: Request, res: Response) => Promise<void>;
/**
 * 48-Hour Urgency Escalation Guard:
 * Auto-escalates HIGH or URGENT priority tickets older than 48h to ADMIN.
 */
export declare const checkAndEscalateTickets: (req: Request, res: Response) => Promise<void>;
export declare const getAdminEscalatedTickets: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ticket.controller.d.ts.map