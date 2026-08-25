// @ts-nocheck
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { encryptData, decryptData } from '../utils/crypto';
import { generateSignedDocumentUrl } from '../utils/security.service';
import { logAudit } from '../utils/auditLogger';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { UAParser } from 'ua-parser-js';
import { getTransporter } from '../utils/notification.service';
import { emitToAll, emitToUser, getIO } from '../socket';



export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      email, password, role, firstName, lastName, otherNames, phoneNumber,
      gender, dateOfBirth, nationality, guardianName, guardianPhone,
      campus, studentId, dateOfAdmission, programmeOfStudy, yearOfStudy, studentType,
      isStudent, avatarUrl
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ message: 'Missing required basic fields' });
      return;
    }

    // Basic Tenant Validation
    if (role === 'TENANT') {
      if (!phoneNumber || !gender || !dateOfBirth || !nationality || !guardianName || !guardianPhone) {
        res.status(400).json({ message: 'Missing required tenant details' });
        return;
      }
      
      // School Information Validation for Students
      if (isStudent) {
        if (!campus || !studentId || !programmeOfStudy || !yearOfStudy || !studentType) {
          res.status(400).json({ message: 'Missing required school information for student tenant' });
          return;
        }
      }
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        avatarUrl,
        passwordHash,
        role: role || 'TENANT',
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
    
    const transporter = getTransporter();
    
    if (transporter) {
      const mailOptions = {
        from: `"Akwaaba Homes" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Verify your Akwaaba Homes Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #4F46E5;">Welcome to Akwaaba Homes!</h2>
            <p style="color: #374151; font-size: 16px;">Hi ${user.firstName},</p>
            <p style="color: #374151; font-size: 16px;">Thank you for registering. To start using your account, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verifyLink}</p>
          </div>
        `,
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
    } else {
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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Verification token is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired verification token' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null // Clear token after use
      }
    });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Missing email or password' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
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

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Parse User-Agent for Device Tracking
    const parser = new UAParser(req.headers['user-agent']);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const userAgentStr = `${browser.name || 'Unknown Browser'} on ${os.name || 'Unknown OS'}`;
    const deviceFamilyStr = device.type ? `${device.vendor || ''} ${device.type}`.trim() : 'Desktop';
    const osFamilyStr = `${os.name || 'Unknown'} ${os.version || ''}`.trim();
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    // Check if this device/IP is new (Anomaly / New Device Detection)
    const existingSessionCount = await prisma.session.count({
      where: {
        userId: user.id,
        userAgent: userAgentStr,
        ipAddress: ipAddress
      }
    });

    if (existingSessionCount === 0) {
      // 🚨 Suspicious / New Device Sign-In Alert
      try {
        await prisma.notification.create({
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
      } catch (e) { /* non-blocking */ }

      try {
        await logAudit(user.id, 'NEW_DEVICE_LOGIN', 'User', user.id, null, { userAgent: userAgentStr, ipAddress }, ipAddress);
      } catch (e) { /* non-blocking */ }
    }

    // Save session in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
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
      message: 'Logged in successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        studentId: user.studentId, // Used to check if onboarding is complete
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
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
    const session = await prisma.session.findUnique({
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

    // Generate new Access Token
    const accessToken = generateAccessToken({ id: session.user.id, role: session.user.role });

    // Update lastActive
    await prisma.session.update({
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
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Invalidate session in DB
      await prisma.session.updateMany({
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
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
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
      user.ghanaCardNumber = decryptData(user.ghanaCardNumber);
    }
    if (user.ghanaCardFrontUrl) {
      user.ghanaCardFrontUrl = generateSignedDocumentUrl(user.ghanaCardFrontUrl);
    }
    if (user.ghanaCardBackUrl) {
      user.ghanaCardBackUrl = generateSignedDocumentUrl(user.ghanaCardBackUrl);
    }

    const hasProperty = (user._count?.properties || 0) > 0;

    res.status(200).json({ user: { ...user, hasProperty } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const requestProfileUnlock = async (req: Request, res: Response): Promise<void> => {
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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.isProfileLocked) {
      res.status(400).json({ message: 'Your profile is currently unlocked and editable.' });
      return;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profileUnlockRequested: true,
        profileUnlockReason: reason.trim()
      }
    });

    const ipAddress = req.ip || (req.socket?.remoteAddress) || 'Unknown';
    await logAudit(req.user.id, 'REQUEST_PROFILE_UNLOCK', 'User', req.user.id, { reason: reason.trim() }, {}, ipAddress);

    res.status(200).json({ message: 'Edit request submitted successfully. An administrator will review your request.' });
  } catch (error: any) {
    console.error('Request profile unlock error:', error?.message || error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const submitGhanaCard = async (req: Request, res: Response): Promise<void> => {
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

    const encryptedCardNumber = encryptData(ghanaCardNumber);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ghanaCardNumber: encryptedCardNumber,
        ghanaCardFrontUrl,
        ghanaCardBackUrl,
        ghanaCardStatus: 'PENDING'
      }
    });

    try {
      emitToUser(req.user.id, 'user_updated', { ghanaCardStatus: 'PENDING' });
      emitToAll('user_updated', { userId: req.user.id });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ message: 'Ghana Card submitted successfully for verification' });
  } catch (error) {
    console.error('Submit Ghana Card error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      firstName, lastName, otherNames, phoneNumber, gender, 
      dateOfBirth, nationality, guardianName, guardianPhone, avatarUrl,
      campus, studentId, dateOfAdmission, programmeOfStudy, yearOfStudy, studentType 
    } = req.body;
    
    if (!req.user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id: req.user.id } });
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

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName, lastName, otherNames, phoneNumber, gender: gender ? gender.toUpperCase() : null, 
        dateOfBirth, nationality, guardianName, guardianPhone, avatarUrl,
        campus, studentId, dateOfAdmission, programmeOfStudy, yearOfStudy, studentType,
        isProfileLocked: true // Lock profile upon hitting Save button
      }
    });

    try {
      emitToUser(req.user.id, 'profile_updated', updatedUser);
      emitToAll('user_updated', { userId: req.user.id });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ 
      message: 'Profile updated and locked successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      res.status(200).json({ message: 'If an account with that email exists, we have sent a reset link.' });
      return;
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExpires }
    });

    // Send email
    const transporter = getTransporter();
    
    if (transporter) {

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    // Send email asynchronously
    transporter.sendMail({
      from: `"AkwaabaHomes" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-w-2xl; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your AkwaabaHomes account.</p>
          <p>Please click the link below to set a new password. This link will expire in 15 minutes.</p>
          <br />
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <br /><br />
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
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
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }

    // Hash the provided token to compare with DB
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpires: { gt: new Date() } // Must not be expired
      }
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired password reset token' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    res.status(200).json({ message: 'Password has been successfully reset' });
  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};
