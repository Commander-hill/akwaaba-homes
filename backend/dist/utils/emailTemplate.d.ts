/**
 * AkwaabaHomes Production Email Templating Engine
 * Designed to a modern, restrained Ghanaian PropTech aesthetic.
 * Clean typography, warm ivory canvas, cross-client safe (Gmail, Apple Mail, Outlook, Mobile).
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
    watermarkUrl?: string;
    logoUrl?: string;
}
export declare const renderInstitutionalEmail: ({ title, preheader, categoryTag, bodyHtml, footerNote, watermarkUrl: customWatermarkUrl, logoUrl: customLogoUrl, }: RenderEmailOptions) => string;
//# sourceMappingURL=emailTemplate.d.ts.map