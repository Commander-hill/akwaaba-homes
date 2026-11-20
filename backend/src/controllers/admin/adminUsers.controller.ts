import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { notifyLandlordVerification } from '../../utils/notification.service';
import { decryptData, maskGhanaCardNumber } from '../../utils/crypto';
import { generateSignedDocumentUrl } from '../../utils/security.service';
import { logAudit } from '../../utils/auditLogger';
import appCache from '../../utils/cache';
import { safeJsonParse } from '../../utils/json';
import { emitToAdmins, emitToAll, emitToUser, getIO } from '../../socket';

const formatLatestBooking = (rawBooking: any) => {
  if (!rawBooking) return null;
  const rawImages = rawBooking.property?.images;
  const parsedImages =
    typeof rawImages === 'string'
      ? safeJsonParse(rawImages, [])
      : Array.isArray(rawImages)
        ? rawImages
        : [];
  return {
    id: rawBooking.id,
    status: rawBooking.status,
    startDate: rawBooking.startDate,
    endDate: rawBooking.endDate,
    property: rawBooking.property
      ? {
          id: rawBooking.property.id,
          title: rawBooking.property.title,
          location: rawBooking.property.location,
          thumbnailUrl: Array.isArray(parsedImages) ? (parsedImages[0] || null) : null
        }
      : null
  };
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, status, search, page, limit } = req.query;

    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = String(role);
    }

    if (status && status !== 'ALL') {
      if (status === 'SUSPENDED') where.isSuspended = true;
      else if (status === 'ACTIVE') where.isSuspended = false;
      else if (status === 'VERIFIED_LANDLORD') where.isVerifiedLandlord = true;
      else if (status === 'VERIFIED_KYC') where.ghanaCardStatus = 'VERIFIED';
      else if (status === 'PENDING_KYC') where.ghanaCardStatus = { in: ['PENDING', 'UNDER_REVIEW'] };
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } }
      ];
    }

    const isPaginated = Boolean(page || limit);
    const pageNum = Math.max(1, parseInt(String(page || 1), 10));
    const takeNum = Math.min(100, Math.max(1, parseInt(String(limit || 50), 10)));
    const skipNum = (pageNum - 1) * takeNum;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(isPaginated ? { skip: skipNum, take: takeNum } : { take: 500 }),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          role: true,
          phoneNumber: true,
          gender: true,
          campus: true,
          studentId: true,
          programmeOfStudy: true,
          studentType: true,
          isSuspended: true,
          isProfileLocked: true,
          profileUnlockRequested: true,
          profileUnlockReason: true,
          ghanaCardStatus: true,
          ghanaCardNumber: true,
          ghanaCardFrontUrl: true,
          ghanaCardBackUrl: true,
          ghanaCardRejectionReason: true,
          ghanaCardReviewedAt: true,
          ghanaCardReviewedBy: true,
          landlordDocUrl: true,
          isVerifiedLandlord: true,
          landlordVerificationStatus: true,
          hostEntityType: true,
          businessName: true,
          primaryRegion: true,
          portfolioSize: true,
          bookings: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  images: true
                }
              }
            }
          },
          reputationScore: true,
          _count: {
            select: { properties: true }
          },
          createdAt: true
        }
      })
    ]);

    // Mask sensitive national identity card numbers in list responses (Act 843 compliance)
    const sanitizedUsers = users.map(user => {
      let maskedCard: string | null = null;
      if (user.ghanaCardNumber) {
        try {
          const decrypted = decryptData(user.ghanaCardNumber);
          maskedCard = maskGhanaCardNumber(decrypted);
        } catch {
          maskedCard = 'GHA-•••••••••';
        }
      }

      return {
        ...user,
        latestBooking: formatLatestBooking((user as any).bookings?.[0]),
        ghanaCardNumber: maskedCard,
        ghanaCardFrontUrl: generateSignedDocumentUrl(user.ghanaCardFrontUrl),
        ghanaCardBackUrl: generateSignedDocumentUrl(user.ghanaCardBackUrl),
        landlordDocUrl: generateSignedDocumentUrl(user.landlordDocUrl)
      };
    });

    if (isPaginated) {
      res.status(200).json({
        users: sanitizedUsers,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / takeNum),
        limit: takeNum
      });
    } else {
      res.status(200).json(sanitizedUsers);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        properties: {
          select: { id: true, title: true, type: true, location: true, price: true, approvalStatus: true, isAvailable: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        bookings: {
          include: {
            property: { select: { id: true, title: true, location: true } },
            transaction: { select: { id: true, amount: true, status: true, reference: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        transactionsAsTenant: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        transactionsAsLandlord: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        reviews: {
          include: {
            booking: { include: { property: { select: { id: true, title: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        tenantBreaches: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' }
        },
        reportedBreaches: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let decryptedCard: string | null = null;
    let maskedCard: string | null = null;
    if (user.ghanaCardNumber) {
      try {
        decryptedCard = decryptData(user.ghanaCardNumber);
        maskedCard = maskGhanaCardNumber(decryptedCard);
      } catch {
        maskedCard = 'GHA-•••••••••';
      }
    }

    // Act 843 Statutory Compliance: Audit log administrative access to sensitive identity PII
    try {
      await logAudit(
        req.user.id,
        'KYC_PII_DOCUMENT_INSPECTED',
        'User',
        user.id,
        {
          inspectedUserId: user.id,
          hasGhanaCard: !!user.ghanaCardNumber,
          hasLandlordDoc: !!user.landlordDocUrl,
          complianceAct: 'Act 843 Section 20'
        },
        null,
        req.ip || 'ADMIN_CONSOLE'
      );
    } catch (e) {}

    res.status(200).json({
      ...user,
      ghanaCardNumber: decryptedCard,
      maskedGhanaCard: maskedCard,
      ghanaCardFrontUrl: generateSignedDocumentUrl(user.ghanaCardFrontUrl),
      ghanaCardBackUrl: generateSignedDocumentUrl(user.ghanaCardBackUrl),
      landlordDocUrl: generateSignedDocumentUrl(user.landlordDocUrl)
    });
  } catch (error) {
    console.error('Error fetching user by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdministrators = async (req: Request, res: Response): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phoneNumber: true,
        isSuspended: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching administrators:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAdministrator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: 'Missing required administrator fields' });
      return;
    }

    const assignedRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: 'A user with this email address already exists' });
      return;
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        phoneNumber: phoneNumber || null,
        passwordHash,
        role: assignedRole,
        isEmailVerified: true
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
    });

    await logAudit(
      req.user.id,
      'CREATE_ADMINISTRATOR',
      'User',
      newAdmin.id,
      null,
      { email: normalizedEmail, role: assignedRole },
      req.ip || req.socket.remoteAddress
    );

    res.status(201).json({ message: 'Administrator account provisioned successfully', admin: newAdmin });
  } catch (error) {
    console.error('Error creating administrator:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleAdminStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isSuspended } = req.body;

    if (id === req.user.id) {
      res.status(400).json({ message: 'Security restriction: You cannot suspend your own administrative account.' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || !['ADMIN', 'SUPER_ADMIN'].includes(target.role)) {
      res.status(404).json({ message: 'Administrator account not found.' });
      return;
    }

    if (target.role === 'SUPER_ADMIN' && isSuspended) {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isSuspended: false }
      });
      if (superAdminCount <= 1) {
        res.status(400).json({ message: 'Operation aborted: Cannot suspend the last active Super Administrator.' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isSuspended: Boolean(isSuspended) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isSuspended: true }
    });

    await logAudit(
      req.user.id,
      isSuspended ? 'SUSPEND_ADMIN' : 'REINSTATE_ADMIN',
      'User',
      id,
      { isSuspended: target.isSuspended },
      { isSuspended },
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: `Administrator status updated to ${isSuspended ? 'Suspended' : 'Active'}`, admin: updated });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleUserSuspension = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isSuspended } = req.body;
    const targetSuspensionState = Boolean(isSuspended);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Security policy: General user suspension cannot target administrators or super administrators
    if (['ADMIN', 'SUPER_ADMIN'].includes(targetUser.role)) {
      res.status(403).json({ 
        message: 'Security Policy: Administrative accounts cannot be suspended via general user moderation. Only an authorized Super Administrator can manage administrator lifecycle.' 
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isSuspended: targetSuspensionState },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isSuspended: true }
    });

    if (targetSuspensionState) {
      // Invalidate all active sessions for suspended user immediately
      await prisma.session.deleteMany({ where: { userId: id } });
      appCache.del(`user:me:${id}`);

      // Deactivate all listings if suspended user is a landlord
      if (targetUser.role === 'LANDLORD') {
        await prisma.property.updateMany({
          where: { landlordId: id },
          data: { isAvailable: false }
        });
      }

      try {
        getIO().to(id).emit('session_revoked', { reason: 'Your account has been suspended by an administrator.' });
        if (targetUser.role === 'LANDLORD') {
          getIO().emit('property_updated', { landlordId: id });
        }
      } catch (e) {}
    }

    try {
      emitToAll('user_updated', { userId: id, isSuspended: targetSuspensionState });
    } catch (e) {
      console.warn('Socket notification for user suspension failed:', e);
    }

    await logAudit(
      req.user.id,
      targetSuspensionState ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      'User',
      id,
      { isSuspended: targetUser.isSuspended },
      { isSuspended: targetSuspensionState },
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ 
      message: `User ${updatedUser.firstName} ${updatedUser.lastName} has been ${targetSuspensionState ? 'suspended' : 'unsuspended'} successfully.`, 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error toggling user suspension:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleUserProfileLock = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isProfileLocked } = req.body;
    const targetLockState = Boolean(isProfileLocked);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        isProfileLocked: targetLockState,
        profileUnlockRequested: false,
        profileUnlockReason: null
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isProfileLocked: true }
    });

    // Clear user cache so /auth/me reflects fresh profile lock state immediately
    appCache.del(`user:me:${id}`);

    await prisma.notification.create({
      data: {
        userId: id,
        type: 'ANNOUNCEMENT',
        title: targetLockState ? '🔒 Profile Locked' : '🔓 Profile Edit Access Granted',
        message: targetLockState 
          ? 'Your profile credentials have been locked by an administrator.' 
          : 'An administrator has unlocked your profile. You can now update your details.',
        link: '/dashboard/profile'
      }
    }).catch(() => null);

    await logAudit(
      req.user.id,
      targetLockState ? 'LOCK_USER_PROFILE' : 'UNLOCK_USER_PROFILE',
      'User',
      id,
      { isProfileLocked: targetUser.isProfileLocked },
      { isProfileLocked: targetLockState },
      req.ip || req.socket.remoteAddress
    );

    // Notify user in real-time so their profile page updates without refresh
    try {
      getIO().to(id).emit('user_updated', { isProfileLocked: targetLockState });
      if (!targetLockState) {
        getIO().to(id).emit('notification', {
          title: '🔓 Profile Edit Access Granted',
          message: 'An administrator has unlocked your profile. You can now update your information.',
          type: 'profile'
        });
      }
    } catch (e) { /* socket optional */ }

    res.status(200).json({
      message: `User ${updatedUser.firstName} ${updatedUser.lastName}'s profile lock status has been updated to ${targetLockState ? 'Locked' : 'Unlocked (Edit Access Granted)'}.`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error toggling user profile lock:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyUserCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, reason } = req.body; // PENDING, UNDER_REVIEW, VERIFIED, REJECTED, RESUBMISSION_REQUIRED

    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: `Invalid status. Allowed values: ${validStatuses.join(', ')}` });
      return;
    }

    if (['REJECTED', 'RESUBMISSION_REQUIRED'].includes(status) && (!reason || !String(reason).trim())) {
      res.status(400).json({ 
        message: 'A clear explanation/reason is required when rejecting or requesting document resubmission.' 
      });
      return;
    }

    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const trimmedReason = reason ? String(reason).trim() : null;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ghanaCardStatus: status,
        ghanaCardRejectionReason: ['REJECTED', 'RESUBMISSION_REQUIRED'].includes(status) ? trimmedReason : null,
        ghanaCardReviewedAt: new Date(),
        ghanaCardReviewedBy: req.user?.id || 'ADMIN'
      },
      select: { 
        id: true, 
        ghanaCardStatus: true,
        ghanaCardRejectionReason: true,
        ghanaCardReviewedAt: true,
        ghanaCardReviewedBy: true
      }
    });

    await logAudit(
      req.user.id,
      `KYC_STATUS_${status}`,
      'User',
      id,
      { ghanaCardStatus: oldUser.ghanaCardStatus },
      { ghanaCardStatus: status, reason: trimmedReason },
      req.ip || req.socket.remoteAddress
    );

    // Clear cached profile so dashboard and verification page immediately reflect new status
    appCache.del(`user:me:${id}`);
    appCache.flushAll();

    // Determine notification copy based on status
    let notificationTitle = '🪪 Ghana Card Verification Update';
    let notificationMessage = `Your Ghana Card status has been updated to ${status}.`;
    let notifType = 'SYSTEM_ALERT';

    if (status === 'VERIFIED') {
      notificationTitle = '✅ Ghana Card Identity Verified!';
      notificationMessage = 'Your Ghana Card has been approved. You now have full access to listings and bookings.';
      notifType = 'ANNOUNCEMENT';
    } else if (status === 'UNDER_REVIEW') {
      notificationTitle = '🔍 Ghana Card Under Review';
      notificationMessage = 'Our compliance team is currently reviewing your Ghana Card identity credentials.';
      notifType = 'INFO';
    } else if (status === 'RESUBMISSION_REQUIRED') {
      notificationTitle = '⚠️ Ghana Card Resubmission Required';
      notificationMessage = `Please re-upload your Ghana Card images: ${trimmedReason}`;
      notifType = 'SYSTEM_ALERT';
    } else if (status === 'REJECTED') {
      notificationTitle = '❌ Ghana Card Verification Rejected';
      notificationMessage = `Your Ghana Card submission was rejected: ${trimmedReason}`;
      notifType = 'SYSTEM_ALERT';
    }

    // In-app persistent notification
    await prisma.notification.create({
      data: {
        userId: id,
        type: notifType,
        title: notificationTitle,
        message: notificationMessage,
        link: '/dashboard/verification'
      }
    }).catch(() => {});

    // Notify the user in real-time and broadcast update to all admins
    try {
      getIO().to(id).emit('notification', {
        title: notificationTitle,
        message: notificationMessage,
        type: 'verification'
      });
      getIO().to(id).emit('user_updated', { 
        ghanaCardStatus: status,
        ghanaCardRejectionReason: user.ghanaCardRejectionReason
      });
      emitToAdmins('verification_updated', { userId: id, ghanaCardStatus: status, type: 'GHANA_CARD' });
      emitToAll('user_updated', { userId: id, ghanaCardStatus: status });
      emitToAll('verification_updated', { userId: id, ghanaCardStatus: status, type: 'GHANA_CARD' });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ 
      message: `User Ghana Card status updated to ${status.replace('_', ' ')} successfully`, 
      user 
    });
  } catch (error) {
    console.error('Error verifying user card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyLandlord = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body; // VERIFIED, REJECTED

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const isVerified = status === 'VERIFIED';

    const user = await prisma.user.update({
      where: { id },
      data: {
        landlordVerificationStatus: status,
        isVerifiedLandlord: isVerified
      }
    });

    appCache.del(`user:me:${id}`);
    appCache.flushAll();

    // Persistent in-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'ANNOUNCEMENT',
        title: isVerified ? 'Verified Landlord Status Approved' : 'Landlord Verification Update',
        message: isVerified
          ? 'Congratulations! Your identity and ownership documents have been verified with official Verified Landlord status.'
          : 'Your landlord verification request was not approved. Please review your documents or contact support.',
        link: '/dashboard/landlord'
      }
    }).catch(() => {});

    try {
      emitToUser(id, 'user_updated', { landlordVerificationStatus: status, isVerifiedLandlord: isVerified });
      emitToAdmins('verification_updated', { userId: id, landlordVerificationStatus: status, isVerifiedLandlord: isVerified, type: 'LANDLORD_DEED' });
      emitToAll('user_updated', { userId: id });
      emitToAll('verification_updated', { userId: id, type: 'LANDLORD_DEED' });
      emitToAll('landlord_deeds_updated', { userId: id });
    } catch (e) {}

    // Dispatch SMS & Email Notification
    notifyLandlordVerification({
      landlordId: user.id,
      landlordEmail: user.email,
      landlordName: `${user.firstName} ${user.lastName}`,
      landlordPhone: user.phoneNumber,
      isVerified
    }).catch((e) => console.error('[Notification Error]', e));

    res.status(200).json({
      message: `Landlord verification ${isVerified ? 'approved with Verified status' : 'rejected'}.`,
      user
    });
  } catch (error) {
    console.error('Error verifying landlord:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Shared account validation, duplicate email check, and password hashing for admin-created users. */
const prepareManagedUserCreation = async (
  body: Record<string, any>,
  res: Response
): Promise<{
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  passwordHash: string;
} | null> => {
  const { firstName, lastName, email, phoneNumber, password } = body;
  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ message: 'First name, last name, email, and temporary password are required.' });
    return null;
  }

  if (String(password).length < 8) {
    res.status(400).json({ message: 'Temporary password must be at least 8 characters.' });
    return null;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    res.status(409).json({ message: 'An account with this email address already exists.' });
    return null;
  }

  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(String(password), 10);

  return {
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
    passwordHash
  };
};

/** Create a landlord user account from the Admin Landlords workspace. */
export const createLandlord = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      businessName,
      primaryRegion,
      hostEntityType,
      isVerifiedLandlord
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: 'First name, last name, email, and temporary password are required.' });
      return;
    }

    if (String(password).length < 8) {
      res.status(400).json({ message: 'Temporary password must be at least 8 characters.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: 'An account with this email address already exists.' });
      return;
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(String(password), 10);
    const verified = Boolean(isVerifiedLandlord);

    const landlord = await prisma.user.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
        passwordHash,
        role: 'LANDLORD',
        businessName: businessName ? String(businessName).trim() : null,
        primaryRegion: primaryRegion ? String(primaryRegion).trim() : null,
        hostEntityType: hostEntityType ? String(hostEntityType).trim() : 'INDIVIDUAL_OWNER',
        isEmailVerified: true,
        isVerifiedLandlord: verified,
        landlordVerificationStatus: verified ? 'VERIFIED' : 'PENDING'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        businessName: true,
        primaryRegion: true,
        hostEntityType: true,
        isVerifiedLandlord: true,
        landlordVerificationStatus: true,
        createdAt: true
      }
    });

    appCache.flushAll();
    await logAudit(
      req.user.id,
      'CREATE_LANDLORD',
      'User',
      landlord.id,
      null,
      { email: normalizedEmail, primaryRegion: landlord.primaryRegion, hostEntityType: landlord.hostEntityType },
      req.ip || req.socket.remoteAddress
    );

    res.status(201).json({ message: 'Landlord account created successfully.', landlord });
  } catch (error) {
    console.error('Error creating landlord:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Update basic landlord profile metadata from the Admin Landlords table. */
export const updateLandlordProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { firstName, lastName, phoneNumber, businessName, primaryRegion, hostEntityType } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'LANDLORD') {
      res.status(404).json({ message: 'Landlord not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined ? { firstName: String(firstName).trim() } : {}),
        ...(lastName !== undefined ? { lastName: String(lastName).trim() } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber ? String(phoneNumber).trim() : null } : {}),
        ...(businessName !== undefined ? { businessName: businessName ? String(businessName).trim() : null } : {}),
        ...(primaryRegion !== undefined ? { primaryRegion: primaryRegion ? String(primaryRegion).trim() : null } : {}),
        ...(hostEntityType !== undefined ? { hostEntityType: hostEntityType ? String(hostEntityType).trim() : null } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        businessName: true,
        primaryRegion: true,
        hostEntityType: true
      }
    });

    appCache.del(`user:me:${id}`);
    appCache.flushAll();
    await logAudit(
      req.user.id,
      'UPDATE_LANDLORD_PROFILE',
      'User',
      id,
      {
        firstName: existing.firstName,
        lastName: existing.lastName,
        phoneNumber: existing.phoneNumber,
        businessName: existing.businessName,
        primaryRegion: existing.primaryRegion,
        hostEntityType: existing.hostEntityType
      },
      updated,
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: 'Landlord details updated.', landlord: updated });
  } catch (error) {
    console.error('Error updating landlord profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Create a tenant user account from the Admin Tenants workspace. */
export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const base = await prepareManagedUserCreation(req.body, res);
    if (!base) return;

    const { campus, studentId, programmeOfStudy, studentType, isKycVerified } = req.body;
    const verified = Boolean(isKycVerified);

    const tenant = await prisma.user.create({
      data: {
        ...base,
        role: 'TENANT',
        campus: campus ? String(campus).trim() : null,
        studentId: studentId ? String(studentId).trim() : null,
        programmeOfStudy: programmeOfStudy ? String(programmeOfStudy).trim() : null,
        studentType: studentType ? String(studentType).trim() : null,
        isEmailVerified: true,
        ghanaCardStatus: verified ? 'VERIFIED' : 'PENDING'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        campus: true,
        studentId: true,
        programmeOfStudy: true,
        studentType: true,
        ghanaCardStatus: true,
        createdAt: true
      }
    });

    appCache.flushAll();
    await logAudit(
      req.user.id,
      'CREATE_TENANT',
      'User',
      tenant.id,
      null,
      { email: base.email, campus: tenant.campus, studentId: tenant.studentId },
      req.ip || req.socket.remoteAddress
    );

    res.status(201).json({ message: 'Tenant account created successfully.', tenant });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Update basic tenant profile metadata from the Admin Tenants table. */
export const updateTenantProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { firstName, lastName, phoneNumber, campus, studentId, programmeOfStudy, studentType } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'TENANT') {
      res.status(404).json({ message: 'Tenant not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined ? { firstName: String(firstName).trim() } : {}),
        ...(lastName !== undefined ? { lastName: String(lastName).trim() } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber ? String(phoneNumber).trim() : null } : {}),
        ...(campus !== undefined ? { campus: campus ? String(campus).trim() : null } : {}),
        ...(studentId !== undefined ? { studentId: studentId ? String(studentId).trim() : null } : {}),
        ...(programmeOfStudy !== undefined ? { programmeOfStudy: programmeOfStudy ? String(programmeOfStudy).trim() : null } : {}),
        ...(studentType !== undefined ? { studentType: studentType ? String(studentType).trim() : null } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        campus: true,
        studentId: true,
        programmeOfStudy: true,
        studentType: true
      }
    });

    appCache.del(`user:me:${id}`);
    appCache.flushAll();
    await logAudit(
      req.user.id,
      'UPDATE_TENANT_PROFILE',
      'User',
      id,
      {
        firstName: existing.firstName,
        lastName: existing.lastName,
        phoneNumber: existing.phoneNumber,
        campus: existing.campus,
        studentId: existing.studentId,
        programmeOfStudy: existing.programmeOfStudy,
        studentType: existing.studentType
      },
      updated,
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: 'Tenant details updated.', tenant: updated });
  } catch (error) {
    console.error('Error updating tenant profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ── UPDATE LANDLORD SETTLEMENT ACCOUNT (ACT 843 & STEP-UP AUTH PROTECTED) ──
 * Modifies payout method, mobile money provider/bank, and payout account number.
 * Protected by requireStepUpAuth.
 */
export const updateLandlordSettlement = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { payoutMethod, payoutProvider, payoutAccountNumber } = req.body;

    if (!payoutMethod || !['MOMO', 'BANK_TRANSFER'].includes(payoutMethod)) {
      res.status(400).json({ message: 'Invalid payout method. Must be MOMO or BANK_TRANSFER.' });
      return;
    }

    if (!payoutAccountNumber || typeof payoutAccountNumber !== 'string' || !payoutAccountNumber.trim()) {
      res.status(400).json({ message: 'Valid payout account number or MoMo phone is required.' });
      return;
    }

    const landlord = await prisma.user.findUnique({ where: { id } });
    if (!landlord || landlord.role !== 'LANDLORD') {
      res.status(404).json({ message: 'Landlord profile not found.' });
      return;
    }

    const previousSettlement = {
      payoutMethod: landlord.payoutMethod,
      payoutProvider: landlord.payoutProvider,
      payoutAccountNumber: landlord.payoutAccountNumber
    };

    const updated = await prisma.user.update({
      where: { id },
      data: {
        payoutMethod,
        payoutProvider: payoutProvider ? String(payoutProvider).trim().toUpperCase() : null,
        payoutAccountNumber: String(payoutAccountNumber).trim()
      }
    });

    appCache.del(`user:me:${id}`);
    appCache.flushAll();

    await logAudit(
      req.user.id,
      'ADMIN_UPDATE_LANDLORD_SETTLEMENT',
      'User',
      id,
      previousSettlement,
      {
        payoutMethod,
        payoutProvider,
        payoutAccountNumber: String(payoutAccountNumber).trim()
      },
      req.ip || 'ADMIN_CONSOLE'
    );

    // Notify landlord about critical banking change
    try {
      await prisma.notification.create({
        data: {
          userId: id,
          type: 'SECURITY_ALERT',
          title: 'Settlement Account Updated',
          message: `Your disbursement account was updated to ${payoutProvider || ''} (${payoutAccountNumber}) by Akwaaba Compliance Admin. If you did not request this, please contact Security immediately.`,
          link: '/dashboard/landlord/wallet'
        }
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Landlord payout settlement account updated successfully.',
      landlord: updated
    });
  } catch (error) {
    console.error('Error updating landlord settlement:', error);
    res.status(500).json({ message: 'Failed to update settlement account.' });
  }
};
