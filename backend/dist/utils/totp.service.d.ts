export declare function base32Encode(buffer: Buffer): string;
export declare function base32Decode(input: string): Buffer;
export declare function generateTOTPSecret(): string;
export declare function formatSecretKey(secret: string): string;
export declare function getTOTPUri(email: string, secret: string, issuer?: string): string;
export declare function generateTOTPCode(secretBase32: string, timeStep?: number, t?: number): string;
export declare function verifyTOTPCode(token: string, secretBase32: string, window?: number): boolean;
export declare function generateRecoveryCodes(count?: number): {
    rawCodes: string[];
    hashedCodes: string[];
};
export declare function hashRecoveryCode(code: string): string;
export declare function verifyAndConsumeRecoveryCode(code: string, hashedCodesJson: string | null): {
    valid: boolean;
    remainingHashedCodes: string[] | null;
};
export declare class QRCodeEncoder {
    typeNumber: number;
    modules: (boolean | null)[][];
    moduleCount: number;
    dataList: string;
    constructor(typeNumber?: number);
    addData(data: string): void;
    make(): void;
    private makeImpl;
    private setupPositionProbePattern;
    private setupTimingPattern;
    private setupPositionAdjustPattern;
    private setupTypeInfo;
    private createData;
    private mapData;
    isDark(row: number, col: number): boolean;
    toSvg(size?: number, margin?: number): string;
}
export declare function generateQRCodeSvg(data: string, size?: number): string;
//# sourceMappingURL=totp.service.d.ts.map