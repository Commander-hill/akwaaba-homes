"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disable2FA = exports.enable2FA = exports.setup2FA = exports.get2FAStatus = exports.resetPassword = exports.forgotPassword = exports.updateProfile = exports.submitStudentVerification = exports.submitLandlordVerification = exports.submitGhanaCard = exports.requestProfileUnlock = exports.getMe = exports.logout = exports.refresh = exports.login2FA = exports.login = exports.verifyEmail = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const jwt_1 = require("../utils/jwt");
const crypto_1 = require("../utils/crypto");
const security_service_1 = require("../utils/security.service");
const auditLogger_1 = require("../utils/auditLogger");
const crypto_2 = __importDefault(require("crypto"));
const ua_parser_js_1 = require("ua-parser-js");
const notification_service_1 = require("../utils/notification.service");
const emailTemplate_1 = require("../utils/emailTemplate");
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
const totp_service_1 = require("../utils/totp.service");
const register = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, otherNames, phoneNumber, gender, dateOfBirth, nationality, guardianName, guardianPhone, campus, studentId, dateOfAdmission, programmeOfStudy, yearOfStudy, studentType, isStudent, avatarUrl } = req.body;
        if (!email || !password || !firstName || !lastName || !role) {
            res.status(400).json({ message: 'Missing required basic registration fields' });
            return;
        }
        if (!phoneNumber || !gender || !nationality) {
            res.status(400).json({ message: 'Missing mandatory personal details (Phone, Gender, and Nationality are required)' });
            return;
        }
        if (role === 'TENANT') {
            if (!dateOfBirth) {
                res.status(400).json({ message: 'Missing mandatory tenant details (Date of Birth is required)' });
                return;
            }
            if (isStudent) {
                if (!guardianName || !guardianPhone) {
                    res.status(400).json({ message: 'Missing mandatory student details (Guardian Name & Phone are required for student tenants)' });
                    return;
                }
                if (!campus || !studentId || !dateOfAdmission || !programmeOfStudy || !yearOfStudy || !studentType) {
                    res.status(400).json({ message: 'Missing mandatory school information for student tenant (Campus, Student ID, Admission Date, Programme, Year, and Student Type are required)' });
                    return;
                }
            }
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await prisma_1.default.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            res.status(409).json({ message: 'User with this email already exists' });
            return;
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Generate verification token
        const verificationToken = crypto_2.default.randomBytes(32).toString('hex');
        // Strict defense-in-depth: public registration only allows TENANT or LANDLORD
        const allowedRoles = ['TENANT', 'LANDLORD'];
        const safeRole = allowedRoles.includes(role) ? role : 'TENANT';
        const user = await prisma_1.default.user.create({
            data: {
                email: normalizedEmail,
                avatarUrl: avatarUrl ? String(avatarUrl).trim() : null,
                passwordHash,
                role: safeRole,
                firstName,
                lastName,
                otherNames,
                phoneNumber,
                gender,
                dateOfBirth,
                nationality,
                guardianName,
                guardianPhone,
                campus: isStudent ? campus : null,
                studentId: isStudent ? studentId : null,
                dateOfAdmission: isStudent ? dateOfAdmission : null,
                programmeOfStudy: isStudent ? programmeOfStudy : null,
                yearOfStudy: isStudent ? yearOfStudy : null,
                studentType: isStudent ? studentType : null,
                isEmailVerified: false,
                emailVerificationToken: verificationToken
            },
        });
        // REAL EMAIL SENDING VIA GMAIL SMTP
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verifyLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
        const transporter = (0, notification_service_1.getTransporter)();
        if (transporter) {
            const bodyHtml = `
        <div style="margin-bottom:24px;">
          <div style="margin-bottom:12px;">
            ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'ACCOUNT SECURITY', value: 'IDENTITY VERIFICATION', variant: 'emerald' })}
          </div>
          <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
            Welcome to Akwaaba Homes — Verify Your Account
          </h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
            Dear <strong>${user.firstName}</strong>, thank you for joining Ghana's institutional housing and tenancy network.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:10px 0 0;">
            To authenticate your account, protect against impersonation, and enable verified tenant/landlord transactions, please confirm your email address below:
          </p>
        </div>

        ${(0, emailTemplate_1.emailCardHtml)(`
          ${(0, emailTemplate_1.emailMetaTableHtml)([
                { label: 'Registered Email', value: user.email },
                { label: 'Platform Role', value: user.role || 'TENANT' },
                { label: 'Identity Protection', value: 'NIA Ghana Card Protocol Ready' },
                { label: 'Legal Compliance', value: 'Rent Act, 1963 (Act 220)' }
            ])}
        `, 'Account Credentials')}

        ${(0, emailTemplate_1.emailButtonHtml)({
                label: 'Verify Email Address',
                url: verifyLink,
                variant: 'primary'
            })}

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin-top:20px;">
          <p style="color:#64748B;font-size:12px;line-height:1.6;margin:0 0 6px;">
            If the button above does not open, copy and paste this secure link directly into your browser:
          </p>
          <p style="color:#0F5132;font-size:11px;font-family:ui-monospace,Menlo,monospace;word-break:break-all;margin:0;">
            ${verifyLink}
          </p>
        </div>
      `;
            const mailOptions = {
                from: `"Akwaaba Homes" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: 'Verify your Akwaaba Homes Account',
                html: (0, emailTemplate_1.renderInstitutionalEmail)({
                    title: 'Verify Your Akwaaba Homes Account',
                    preheader: `Hi ${user.firstName}, please verify your email address on Akwaaba Homes`,
                    categoryTag: 'ACCOUNT ACTIVATION',
                    bodyHtml
                }),
            };
            // Send email asynchronously to prevent blocking the registration request
            transporter.sendMail(mailOptions)
                .then(() => {
                console.log(`✉️  Verification email successfully sent to ${user.email}`);
            })
                .catch((emailError) => {
                console.error('Failed to send verification email via SMTP:', emailError);
                console.log('\n=============================================');
                console.log(`⚠️ SMTP SEND FAILED. MOCK EMAIL LOG:`);
                console.log(`🔗 Verification Link: ${verifyLink}`);
                console.log('=============================================\n');
            });
        }
        else {
            // Fallback for development if real credentials aren't set yet
            console.log('\n=============================================');
            console.log(`⚠️ SMTP NOT CONFIGURED. MOCK EMAIL SENT TO: ${user.email}`);
            console.log(`🔗 Verification Link: ${verifyLink}`);
            console.log('=============================================\n');
        }
        // DO NOT automatically log the user in. They must verify email first.
        res.status(201).json({
            message: 'User created successfully. Please verify your email.',
            requireVerification: true
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: 'Verification token is required' });
            return;
        }
        const user = await prisma_1.default.user.findFirst({
            where: { emailVerificationToken: token }
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid or expired verification token' });
            return;
        }
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailVerificationToken: null // Clear token after use
            }
        });
        res.status(200).json({ message: 'Email verified successfully' });
    }
    catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyEmail = verifyEmail;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Missing email or password' });
            return;
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await prisma_1.default.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        // ── 1. CHECK ACCOUNT LOCKOUT ──
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
            const remainingMinutes = Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / (60 * 1000));
            res.status(429).json({
                message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
                isLocked: true,
                lockoutUntil: user.lockoutUntil
            });
            return;
        }
        const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            const newAttempts = (user.failedLoginAttempts || 0) + 1;
            const updateData = { failedLoginAttempts: newAttempts };
            if (newAttempts >= 5) {
                const lockoutTime = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
                updateData.lockoutUntil = lockoutTime;
                await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: updateData
                });
                try {
                    await (0, auditLogger_1.logAudit)(user.id, 'ACCOUNT_LOCKED', 'User', user.id, null, { attempts: newAttempts, lockoutUntil: lockoutTime }, req.ip);
                }
                catch (e) { /* non-blocking */ }
                res.status(429).json({
                    message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts. Please reset your password or try again later.',
                    isLocked: true
                });
                return;
            }
            else {
                await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: updateData
                });
                const remaining = 5 - newAttempts;
                res.status(401).json({
                    message: `Invalid credentials. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary account lockout)`
                });
                return;
            }
        }
        // Reset failed attempts & lockout on successful login
        if ((user.failedLoginAttempts && user.failedLoginAttempts > 0) || user.lockoutUntil) {
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockoutUntil: null }
            });
        }
        // BLOCK SUSPENDED USERS
        if (user.isSuspended) {
            res.status(403).json({
                message: 'Your account has been suspended by platform administration due to policy violations. Please contact support for assistance.',
                isSuspended: true
            });
            return;
        }
        // BLOCK UNVERIFIED USERS
        if (!user.isEmailVerified) {
            res.status(403).json({
                message: 'Please verify your email address before logging in.',
                requireVerification: true
            });
            return;
        }
        // CHECK TWO-FACTOR AUTHENTICATION (TOTP / RECOVERY CODE)
        if (user.twoFactorEnabled) {
            const tempToken = crypto_2.default.randomBytes(32).toString('hex');
            cache_1.default.set(`2fa_pending_${tempToken}`, user.id, 300); // 5 minutes TTL
            res.status(200).json({
                requireTwoFactor: true,
                tempToken,
                message: 'Two-factor authentication required. Please enter your 6-digit TOTP code or a recovery code.'
            });
            return;
        }
        await establishUserSessionAndRespond(user, req, res);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
// Helper to establish user session, device tracking, cookies and JSON response
const establishUserSessionAndRespond = async (user, req, res, message = 'Logged in successfully') => {
    const currentTokenVersion = user.tokenVersion || 0;
    const accessToken = (0, jwt_1.generateAccessToken)({ id: user.id, role: user.role, tokenVersion: currentTokenVersion });
    const refreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id, tokenVersion: currentTokenVersion });
    // Parse User-Agent for Device Tracking
    const parser = new ua_parser_js_1.UAParser(req.headers['user-agent']);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const userAgentStr = `${browser.name || 'Unknown Browser'} on ${os.name || 'Unknown OS'}`;
    const deviceFamilyStr = device.type ? `${device.vendor || ''} ${device.type}`.trim() : 'Desktop';
    const osFamilyStr = `${os.name || 'Unknown'} ${os.version || ''}`.trim();
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';
    // Check if this device/IP is new (Anomaly / New Device Detection)
    const existingSessionCount = await prisma_1.default.session.count({
        where: {
            userId: user.id,
            userAgent: userAgentStr,
            ipAddress: ipAddress
        }
    });
    if (existingSessionCount === 0) {
        try {
            await prisma_1.default.notification.create({
                data: {
                    userId: user.id,
                    type: 'SECURITY',
                    title: '🚨 New Device Sign-In Detected',
                    message: `Your account was accessed from a new device (${userAgentStr}, IP: ${ipAddress}). If this was not you, revoke remote sessions in Security Settings immediately.`,
                    link: '/dashboard/profile'
                }
            });
            const { getIO } = await import('../socket');
            getIO().to(user.id).emit('notification', {
                title: '🚨 New Device Sign-In Detected',
                message: `Account accessed from ${userAgentStr} (${ipAddress}).`,
                type: 'security'
            });
        }
        catch (e) { /* non-blocking */ }
        try {
            await (0, auditLogger_1.logAudit)(user.id, 'NEW_DEVICE_LOGIN', 'User', user.id, null, { userAgent: userAgentStr, ipAddress }, ipAddress);
        }
        catch (e) { /* non-blocking */ }
    }
    // Save session in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await prisma_1.default.session.create({
        data: {
            userId: user.id,
            refreshToken,
            ipAddress,
            userAgent: userAgentStr,
            deviceFamily: deviceFamilyStr,
            osFamily: osFamilyStr,
            expiresAt
        }
    });
    const isProd = process.env.NODE_ENV === 'production' || !!(process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('onrender'));
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
        path: '/'
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
    res.status(200).json({
        message,
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            studentId: user.studentId,
            twoFactorEnabled: !!user.twoFactorEnabled,
            isVerifiedLandlord: !!user.isVerifiedLandlord,
            landlordVerificationStatus: user.landlordVerificationStatus || 'NOT_SUBMITTED',
        },
    });
};
const login2FA = async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken || !code) {
            res.status(400).json({ message: 'Missing temporary token or verification code' });
            return;
        }
        const userId = cache_1.default.get(`2fa_pending_${tempToken}`);
        if (!userId) {
            res.status(401).json({ message: 'Two-factor session expired or invalid. Please sign in again.' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            res.status(400).json({ message: 'Two-factor authentication is not active on this account.' });
            return;
        }
        const cleanCode = String(code).trim().toUpperCase();
        let isTotpValid = false;
        const decryptedSecret = (0, crypto_1.decryptData)(user.twoFactorSecret);
        if (/^\d{6}$/.test(cleanCode)) {
            isTotpValid = (0, totp_service_1.verifyTOTPCode)(cleanCode, decryptedSecret);
        }
        let isRecoveryValid = false;
        let updatedRecoveryCodes = null;
        if (!isTotpValid) {
            const recoveryCheck = (0, totp_service_1.verifyAndConsumeRecoveryCode)(cleanCode, user.twoFactorRecoveryCodes);
            if (recoveryCheck.valid) {
                isRecoveryValid = true;
                updatedRecoveryCodes = recoveryCheck.remainingHashedCodes;
            }
        }
        if (!isTotpValid && !isRecoveryValid) {
            res.status(401).json({ message: 'Invalid 2FA code or recovery code. Please try again.' });
            return;
        }
        if (isRecoveryValid && updatedRecoveryCodes) {
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: { twoFactorRecoveryCodes: JSON.stringify(updatedRecoveryCodes) }
            });
            try {
                await (0, auditLogger_1.logAudit)(user.id, '2FA_RECOVERY_CODE_CONSUMED', 'User', user.id, null, { remainingCodes: updatedRecoveryCodes.length }, req.ip);
            }
            catch (e) { /* non-blocking */ }
        }
        // Invalidate the pending 2FA token
        cache_1.default.del(`2fa_pending_${tempToken}`);
        try {
            await (0, auditLogger_1.logAudit)(user.id, 'LOGIN_2FA_SUCCESS', 'User', user.id, null, { method: isRecoveryValid ? 'RECOVERY_CODE' : 'TOTP' }, req.ip);
        }
        catch (e) { /* non-blocking */ }
        await establishUserSessionAndRespond(user, req, res, 'Two-factor authentication verified successfully');
    }
    catch (error) {
        console.error('login2FA error:', error);
        res.status(500).json({ message: 'Internal server error during 2FA verification' });
    }
};
exports.login2FA = login2FA;
const refresh = async (req, res) => {
    try {
        let { refreshToken } = req.cookies;
        // Fallback to request body for environments where 3rd-party cookies are blocked
        if (!refreshToken && req.body.refreshToken) {
            refreshToken = req.body.refreshToken;
        }
        if (!refreshToken) {
            res.status(401).json({ message: 'No refresh token provided' });
            return;
        }
        // Check if session exists and is valid in DB
        const session = await prisma_1.default.session.findUnique({
            where: { refreshToken },
            include: { user: true }
        });
        if (!session || !session.isValid || session.expiresAt < new Date()) {
            res.status(401).json({ message: 'Invalid or expired refresh token' });
            return;
        }
        if (session.user.isSuspended) {
            res.status(403).json({ message: 'Account is suspended' });
            return;
        }
        // Generate new Access Token with tokenVersion
        const accessToken = (0, jwt_1.generateAccessToken)({
            id: session.user.id,
            role: session.user.role,
            tokenVersion: session.user.tokenVersion || 0
        });
        // Update lastActive
        await prisma_1.default.session.update({
            where: { id: session.id },
            data: { lastActive: new Date() }
        });
        const isProd = process.env.NODE_ENV === 'production' || !!(process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('onrender'));
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000, // 15 mins
            path: '/'
        });
        res.status(200).json({
            message: 'Token refreshed successfully',
            accessToken,
            refreshToken // Return the same refresh token so frontend can keep it if needed
        });
    }
    catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        let { refreshToken } = req.cookies || {};
        if (!refreshToken && req.body?.refreshToken) {
            refreshToken = req.body.refreshToken;
        }
        if (refreshToken) {
            // Invalidate session in DB
            await prisma_1.default.session.updateMany({
                where: { refreshToken },
                data: { isValid: false }
            });
        }
        const isProd = process.env.NODE_ENV === 'production' || !!(process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('onrender'));
        res.cookie('accessToken', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            expires: new Date(0),
            path: '/'
        });
        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            expires: new Date(0),
            path: '/'
        });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        const cacheKey = `user:me:${userId}`;
        // Serve from cache if available (60-second TTL)
        const cached = cache_1.default.get(cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                isEmailVerified: true,
                ghanaCardNumber: true,
                ghanaCardStatus: true,
                ghanaCardFrontUrl: true,
                ghanaCardBackUrl: true,
                landlordDocUrl: true,
                isVerifiedLandlord: true,
                landlordVerificationStatus: true,
                otherNames: true,
                phoneNumber: true,
                gender: true,
                dateOfBirth: true,
                nationality: true,
                guardianName: true,
                guardianPhone: true,
                avatarUrl: true,
                campus: true,
                studentId: true,
                dateOfAdmission: true,
                programmeOfStudy: true,
                yearOfStudy: true,
                studentType: true,
                reputationScore: true,
                isProfileLocked: true,
                profileUnlockRequested: true,
                profileUnlockReason: true,
                _count: {
                    select: { properties: true }
                }
            }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.ghanaCardNumber) {
            user.ghanaCardNumber = (0, crypto_1.decryptData)(user.ghanaCardNumber);
        }
        if (user.ghanaCardFrontUrl) {
            user.ghanaCardFrontUrl = (0, security_service_1.generateSignedDocumentUrl)(user.ghanaCardFrontUrl);
        }
        if (user.ghanaCardBackUrl) {
            user.ghanaCardBackUrl = (0, security_service_1.generateSignedDocumentUrl)(user.ghanaCardBackUrl);
        }
        if (user.landlordDocUrl) {
            user.landlordDocUrl = (0, security_service_1.generateSignedDocumentUrl)(user.landlordDocUrl);
        }
        const hasProperty = (user._count?.properties || 0) > 0;
        const responsePayload = { user: { ...user, hasProperty } };
        // Cache for 60 seconds
        cache_1.default.set(cacheKey, responsePayload, 60);
        res.status(200).json(responsePayload);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMe = getMe;
const requestProfileUnlock = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!reason || !reason.trim()) {
            res.status(400).json({ message: 'Please state a reason for requesting profile edit access.' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (!user.isProfileLocked) {
            res.status(400).json({ message: 'Your profile is currently unlocked and editable.' });
            return;
        }
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                profileUnlockRequested: true,
                profileUnlockReason: reason.trim()
            }
        });
        const ipAddress = req.ip || (req.socket?.remoteAddress) || 'Unknown';
        await (0, auditLogger_1.logAudit)(req.user.id, 'REQUEST_PROFILE_UNLOCK', 'User', req.user.id, { reason: reason.trim() }, {}, ipAddress);
        // Alert admins of profile unlock request
        const admins = await prisma_1.default.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (admins.length > 0) {
            await prisma_1.default.notification.createMany({
                data: admins.map(a => ({
                    userId: a.id,
                    type: 'SYSTEM_ALERT',
                    title: '🔓 Profile Unlock Requested',
                    message: `${user.firstName || 'User'} ${user.lastName || ''} requested profile unlock: "${reason.trim()}".`,
                    link: '/admin/users'
                }))
            }).catch(() => null);
        }
        res.status(200).json({ message: 'Edit request submitted successfully. An administrator will review your request.' });
    }
    catch (error) {
        console.error('Request profile unlock error:', error?.message || error);
        res.status(500).json({ message: error?.message || 'Internal server error' });
    }
};
exports.requestProfileUnlock = requestProfileUnlock;
const submitGhanaCard = async (req, res) => {
    try {
        const { ghanaCardNumber, ghanaCardFrontUrl, ghanaCardBackUrl } = req.body;
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!ghanaCardNumber || !ghanaCardFrontUrl || !ghanaCardBackUrl) {
            res.status(400).json({ message: 'Ghana Card Number and both images are required' });
            return;
        }
        const encryptedCardNumber = (0, crypto_1.encryptData)(ghanaCardNumber);
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                ghanaCardNumber: encryptedCardNumber,
                ghanaCardFrontUrl,
                ghanaCardBackUrl,
                ghanaCardStatus: 'PENDING'
            }
        });
        // Bust user cache so next /auth/me returns fresh Ghana Card data
        cache_1.default.del(`user:me:${req.user.id}`);
        // Notify admins of new KYC Ghana Card submission
        const cardAdmins = await prisma_1.default.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (cardAdmins.length > 0) {
            await prisma_1.default.notification.createMany({
                data: cardAdmins.map(a => ({
                    userId: a.id,
                    type: 'SYSTEM_ALERT',
                    title: '🪪 New Ghana Card KYC Submission',
                    message: `User submitted Ghana Card for identity verification.`,
                    link: '/admin/users'
                }))
            }).catch(() => null);
        }
        try {
            (0, socket_1.emitToUser)(req.user.id, 'user_updated', { ghanaCardStatus: 'PENDING' });
            (0, socket_1.emitToAll)('user_updated', { userId: req.user.id });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({ message: 'Ghana Card submitted successfully for verification' });
    }
    catch (error) {
        console.error('Submit Ghana Card error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.submitGhanaCard = submitGhanaCard;
const submitLandlordVerification = async (req, res) => {
    try {
        const { ghanaCardNumber, ghanaCardFrontUrl, ghanaCardBackUrl, landlordDocUrl } = req.body;
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (req.user.role !== 'LANDLORD' && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only landlords can submit landlord verification' });
            return;
        }
        if (!ghanaCardNumber || !ghanaCardFrontUrl || !ghanaCardBackUrl || !landlordDocUrl) {
            res.status(400).json({ message: 'Ghana Card details and Property Ownership Document are required' });
            return;
        }
        const encryptedCardNumber = (0, crypto_1.encryptData)(ghanaCardNumber);
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                ghanaCardNumber: encryptedCardNumber,
                ghanaCardFrontUrl,
                ghanaCardBackUrl,
                landlordDocUrl,
                landlordVerificationStatus: 'PENDING'
            }
        });
        cache_1.default.del(`user:me:${req.user.id}`);
        // Notify admins of new Landlord verification document submission
        const landlordAdmins = await prisma_1.default.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (landlordAdmins.length > 0) {
            await prisma_1.default.notification.createMany({
                data: landlordAdmins.map(a => ({
                    userId: a.id,
                    type: 'SYSTEM_ALERT',
                    title: '🛡️ Landlord Verification Document Submitted',
                    message: `Landlord submitted property ownership & Ghana Card for verification.`,
                    link: '/admin/landlord-verification'
                }))
            }).catch(() => null);
        }
        try {
            (0, socket_1.emitToUser)(req.user.id, 'user_updated', { landlordVerificationStatus: 'PENDING' });
            (0, socket_1.emitToAll)('user_updated', { userId: req.user.id });
        }
        catch (e) { }
        res.status(200).json({ message: 'Landlord verification document submitted successfully for admin review' });
    }
    catch (error) {
        console.error('Submit Landlord Verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.submitLandlordVerification = submitLandlordVerification;
const submitStudentVerification = async (req, res) => {
    try {
        const { campus, studentId, programmeOfStudy, yearOfStudy, dateOfAdmission, studentType } = req.body;
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!campus || !campus.trim() || !studentId || !studentId.trim()) {
            res.status(400).json({ message: 'Institution/Campus and Student ID are required to verify student status' });
            return;
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                campus: campus.trim(),
                studentId: studentId.trim(),
                ...(programmeOfStudy ? { programmeOfStudy: programmeOfStudy.trim() } : {}),
                ...(yearOfStudy ? { yearOfStudy: yearOfStudy.trim() } : {}),
                ...(dateOfAdmission ? { dateOfAdmission: dateOfAdmission.trim() } : {}),
                ...(studentType ? { studentType: studentType.trim() } : {}),
            }
        });
        cache_1.default.del(`user:me:${req.user.id}`);
        try {
            (0, socket_1.emitToUser)(req.user.id, 'profile_updated', updatedUser);
            (0, socket_1.emitToAll)('user_updated', { userId: req.user.id });
        }
        catch (e) { /* non-blocking */ }
        await prisma_1.default.notification.create({
            data: {
                userId: req.user.id,
                type: 'ANNOUNCEMENT',
                title: '🎓 Student Status Verified',
                message: `Your student profile for ${campus.trim()} has been registered. Student hostels and roommate matching are now fully unlocked!`,
                link: '/dashboard/tenant'
            }
        }).catch(() => null);
        const ipAddress = req.ip || (req.socket?.remoteAddress) || 'Unknown';
        await (0, auditLogger_1.logAudit)(req.user.id, 'SUBMIT_STUDENT_VERIFICATION', 'User', req.user.id, { campus: campus.trim(), studentId: studentId.trim() }, {}, ipAddress);
        res.status(200).json({
            message: 'Student status credentials registered successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Submit Student Verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.submitStudentVerification = submitStudentVerification;
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, otherNames, phoneNumber, gender, dateOfBirth, nationality, guardianName, guardianPhone, avatarUrl, campus, studentId, dateOfAdmission, programmeOfStudy, yearOfStudy, studentType } = req.body;
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const existingUser = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
        if (!existingUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Strict Immutability Check: If profile is locked and user is not ADMIN, block edits
        if (existingUser.isProfileLocked && req.user.role !== 'ADMIN') {
            res.status(403).json({
                message: 'Your profile is locked and read-only. Only an administrator can grant access to modify your credentials.'
            });
            return;
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                firstName, lastName, otherNames, phoneNumber,
                gender: gender !== undefined ? (gender ? gender.toUpperCase() : null) : existingUser.gender,
                dateOfBirth, nationality, guardianName, guardianPhone, avatarUrl,
                campus, studentId, dateOfAdmission, programmeOfStudy, yearOfStudy, studentType,
                isProfileLocked: true // Lock profile upon hitting Save button
            }
        });
        // Bust user cache so next /auth/me returns fresh data
        cache_1.default.del(`user:me:${req.user.id}`);
        try {
            (0, socket_1.emitToUser)(req.user.id, 'profile_updated', updatedUser);
            (0, socket_1.emitToAll)('user_updated', { userId: req.user.id });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({
            message: 'Profile updated and locked successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
const forgotPassword = async (req, res) => {
    try {
        const normalizedEmail = (req.body.email || '').toLowerCase().trim();
        if (!normalizedEmail) {
            res.status(400).json({ message: 'Email address is required' });
            return;
        }
        const user = await prisma_1.default.user.findFirst({
            where: {
                email: { equals: normalizedEmail, mode: 'insensitive' }
            }
        });
        if (!user) {
            // Return 200 even if user not found to prevent email enumeration
            res.status(200).json({ message: 'If an account with that email exists, we have sent a reset link.' });
            return;
        }
        // Generate secure token
        const resetToken = crypto_2.default.randomBytes(32).toString('hex');
        const resetPasswordToken = crypto_2.default.createHash('sha256').update(resetToken).digest('hex');
        const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { resetPasswordToken, resetPasswordExpires }
        });
        // Send email
        const transporter = (0, notification_service_1.getTransporter)();
        if (transporter) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
            const bodyHtml = `
      <div style="margin-bottom:24px;">
        <div style="margin-bottom:12px;">
          ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'SECURITY NOTICE', value: '15-MINUTE EXPIRATION', variant: 'gold' })}
        </div>
        <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
          Account Password Recovery Protocol
        </h2>
        <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
          A password reset request was initiated for your Akwaaba Homes account associated with <strong>${user.email}</strong>.
        </p>
        <p style="color:#475569;font-size:15px;line-height:1.7;margin:10px 0 0;">
          To authorize this security request and create a new password, click the secure credential reset button below:
        </p>
      </div>

      ${(0, emailTemplate_1.emailCardHtml)(`
        ${(0, emailTemplate_1.emailMetaTableHtml)([
                { label: 'Security Window', value: '15 Minutes From Request' },
                { label: 'Target Account', value: user.email },
                { label: 'Authentication Protocol', value: 'SHA-256 Single-Use Nonce Token' },
                { label: 'Platform Protection', value: 'Ghana Cyber Security Authority (Act 1038) Standards' }
            ])}
      `, 'Security Assessment')}

      ${(0, emailTemplate_1.emailButtonHtml)({
                label: 'Reset Account Password',
                url: resetUrl,
                variant: 'primary'
            })}

      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px;margin-top:20px;">
        <p style="color:#92400E;font-size:13px;line-height:1.6;margin:0;">
          🔒 <strong>Did not request this?</strong> If you did not initiate this password recovery request, your account remains secure. You can safely disregard this email or notify <a href="mailto:support@akwaabahomes.com" style="color:#0F5132;font-weight:700;">support@akwaabahomes.com</a> immediately.
        </p>
      </div>
    `;
            // Send email asynchronously
            transporter.sendMail({
                from: `"Akwaaba Homes Security" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: 'Security Alert: Password Reset Request — Akwaaba Homes',
                html: (0, emailTemplate_1.renderInstitutionalEmail)({
                    title: 'Account Password Recovery Protocol',
                    preheader: 'Reset your Akwaaba Homes account password (valid for 15 minutes)',
                    categoryTag: 'SECURITY VERIFICATION',
                    bodyHtml
                }),
            })
                .then(() => console.log(`✉️  Password reset email successfully sent to ${user.email}`))
                .catch((emailError) => {
                console.error('Failed to send password reset email via SMTP:', emailError);
                console.log('\n=============================================');
                console.log(`⚠️ SMTP SEND FAILED. MOCK EMAIL LOG:`);
                console.log(`🔗 Password Reset Link: ${resetUrl}`);
                console.log('=============================================\n');
            });
        }
        res.status(200).json({ message: 'If an account with that email exists, we have sent a reset link.' });
    }
    catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Failed to process request' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ message: 'Token and new password are required' });
            return;
        }
        // Hash the provided token to compare with DB
        const resetPasswordToken = crypto_2.default.createHash('sha256').update(token).digest('hex');
        const user = await prisma_1.default.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { gt: new Date() } // Must not be expired
            }
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid or expired password reset token' });
            return;
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(newPassword, salt);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                failedLoginAttempts: 0,
                lockoutUntil: null,
                tokenVersion: { increment: 1 } // Instantly invalidates all previous sessions / JWTs
            }
        });
        // Invalidate all active Session records in DB
        await prisma_1.default.session.updateMany({
            where: { userId: user.id, isValid: true },
            data: { isValid: false }
        }).catch(() => { });
        // Flush cache & emit session_revoked to all connected client sockets
        try {
            cache_1.default.del(`user:me:${user.id}`);
            const io = (0, socket_1.getIO)();
            io.to(user.id).emit('session_revoked', { reason: 'PASSWORD_RESET' });
        }
        catch (e) { /* non-blocking */ }
        try {
            await (0, auditLogger_1.logAudit)(user.id, 'PASSWORD_RESET_SUCCESS', 'User', user.id, null, null, req.ip);
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({ message: 'Password has been successfully reset. Please log in with your new credentials.' });
    }
    catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
};
exports.resetPassword = resetPassword;
// ─── TWO-FACTOR AUTHENTICATION (TOTP / RFC 6238) MANAGEMENT ───────────────────
const get2FAStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { twoFactorEnabled: true, twoFactorRecoveryCodes: true }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        let remainingRecoveryCodes = 0;
        if (user.twoFactorRecoveryCodes) {
            try {
                const parsed = JSON.parse(user.twoFactorRecoveryCodes);
                if (Array.isArray(parsed))
                    remainingRecoveryCodes = parsed.length;
            }
            catch (e) { /* ignore */ }
        }
        res.status(200).json({
            twoFactorEnabled: !!user.twoFactorEnabled,
            remainingRecoveryCodes
        });
    }
    catch (error) {
        console.error('get2FAStatus error:', error);
        res.status(500).json({ message: 'Failed to retrieve 2FA status' });
    }
};
exports.get2FAStatus = get2FAStatus;
const setup2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Preserve existing pending setup secret if user re-opens modal within TTL, unless explicit reset requested
        const existing = req.query.reset === 'true'
            ? null
            : cache_1.default.get(`2fa_setup_${userId}`);
        let secret = existing?.secret;
        let rawCodes = existing?.rawCodes;
        let hashedCodes = existing?.hashedCodes;
        if (!secret || !rawCodes || !hashedCodes) {
            secret = (0, totp_service_1.generateTOTPSecret)();
            const generated = (0, totp_service_1.generateRecoveryCodes)(8);
            rawCodes = generated.rawCodes;
            hashedCodes = generated.hashedCodes;
        }
        // Refresh temporary setup data for 10 minutes
        cache_1.default.set(`2fa_setup_${userId}`, { secret, hashedCodes, rawCodes }, 600);
        res.status(200).json({
            secret,
            formattedSecret: (0, totp_service_1.formatSecretKey)(secret),
            qrCodeSvg,
            rawCodes,
            otpauthUri: uri,
            message: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator) or enter the secret key manually.'
        });
    }
    catch (error) {
        console.error('setup2FA error:', error);
        res.status(500).json({ message: 'Failed to initialize 2FA setup' });
    }
};
exports.setup2FA = setup2FA;
const enable2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { code } = req.body;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!code || typeof code !== 'string') {
            res.status(400).json({ message: 'Verification code is required' });
            return;
        }
        const setupData = cache_1.default.get(`2fa_setup_${userId}`);
        if (!setupData) {
            res.status(400).json({ message: '2FA setup session expired. Please start the setup process again.' });
            return;
        }
        const isValid = (0, totp_service_1.verifyTOTPCode)(code.trim(), setupData.secret);
        if (!isValid) {
            res.status(400).json({ message: 'Invalid 6-digit code. Please verify the code displayed in your authenticator app.' });
            return;
        }
        const encryptedSecret = (0, crypto_1.encryptData)(setupData.secret);
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: encryptedSecret,
                twoFactorRecoveryCodes: JSON.stringify(setupData.hashedCodes)
            }
        });
        cache_1.default.del(`2fa_setup_${userId}`);
        try {
            await (0, auditLogger_1.logAudit)(userId, '2FA_ENABLED', 'User', userId, null, {}, req.ip);
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({
            success: true,
            message: 'Two-factor authentication has been successfully activated on your account!'
        });
    }
    catch (error) {
        console.error('enable2FA error:', error);
        res.status(500).json({ message: 'Failed to enable 2FA' });
    }
};
exports.enable2FA = enable2FA;
const disable2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { password, code } = req.body;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (!user.twoFactorEnabled) {
            res.status(400).json({ message: '2FA is not currently enabled on your account.' });
            return;
        }
        // Require either correct account password or valid current TOTP code to disable
        let isAuthorized = false;
        if (password) {
            isAuthorized = await bcrypt_1.default.compare(password, user.passwordHash);
        }
        if (!isAuthorized && code && user.twoFactorSecret) {
            const decryptedSecret = (0, crypto_1.decryptData)(user.twoFactorSecret);
            isAuthorized = (0, totp_service_1.verifyTOTPCode)(String(code).trim(), decryptedSecret);
        }
        if (!isAuthorized) {
            res.status(401).json({ message: 'Invalid password or verification code. Cannot disable 2FA without valid authorization.' });
            return;
        }
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorRecoveryCodes: null
            }
        });
        try {
            await (0, auditLogger_1.logAudit)(userId, '2FA_DISABLED', 'User', userId, null, {}, req.ip);
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({
            success: true,
            message: 'Two-factor authentication has been disabled.'
        });
    }
    catch (error) {
        console.error('disable2FA error:', error);
        res.status(500).json({ message: 'Failed to disable 2FA' });
    }
};
exports.disable2FA = disable2FA;
//# sourceMappingURL=auth.controller.js.map