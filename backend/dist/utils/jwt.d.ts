import jwt from 'jsonwebtoken';
export declare const generateAccessToken: (payload: {
    id: string;
    role: string;
}) => string;
export declare const generateRefreshToken: (payload: {
    id: string;
}) => string;
export declare const verifyAccessToken: (token: string) => string | jwt.JwtPayload;
export declare const verifyRefreshToken: (token: string) => string | jwt.JwtPayload;
//# sourceMappingURL=jwt.d.ts.map