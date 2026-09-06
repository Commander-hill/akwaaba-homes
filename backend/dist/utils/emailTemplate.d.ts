/**
 * Akwaaba Homes Institutional Email Templating Engine
 * Designed to Ghanaian Forest Emerald (#0F5132) & Heritage Gold (#D97706) aesthetic.
 * Fully responsive, cross-client safe (Gmail, Apple Mail, Outlook, Mobile).
 */
export interface EmailBadge {
    label: string;
    value: string;
    variant?: 'emerald' | 'gold' | 'slate' | 'rose' | 'blue';
}
export interface EmailAction {
    label: string;
    url: string;
    variant?: 'primary' | 'secondary' | 'accent' | 'danger';
}
export interface EmailMetaRow {
    label: string;
    value: string;
    isMono?: boolean;
    highlight?: boolean;
}
export declare const emailBadgeHtml: (badge: EmailBadge) => string;
export declare const emailButtonHtml: (action: EmailAction) => string;
export declare const emailCardHtml: (contentHtml: string, title?: string) => string;
export declare const emailMetaTableHtml: (rows: EmailMetaRow[]) => string;
export interface RenderEmailOptions {
    title: string;
    preheader: string;
    categoryTag?: string;
    bodyHtml: string;
    footerNote?: string;
}
export declare const renderInstitutionalEmail: ({ title, preheader, categoryTag, bodyHtml, footerNote, }: RenderEmailOptions) => string;
//# sourceMappingURL=emailTemplate.d.ts.map