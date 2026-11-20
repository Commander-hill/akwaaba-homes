import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { notifyPropertyApproval } from '../../utils/notification.service';
import { logAudit } from '../../utils/auditLogger';
import appCache from '../../utils/cache';
import { safeJsonParse } from '../../utils/json';
import { emitToAll, getIO } from '../../socket';

export const getAllProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        landlord: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsedProperties = properties.map(p => ({
      ...p,
      images: safeJsonParse(p.images, []),
      amenities: safeJsonParse(p.amenities, [])
    }));

    res.status(200).json(parsedProperties);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            isVerifiedLandlord: true,
            landlordVerificationStatus: true,
            reputationScore: true,
            createdAt: true
          }
        },
        rooms: {
          include: {
            roomUnits: {
              include: {
                beds: true
              }
            }
          }
        },
        bookings: {
          include: {
            tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
            transaction: { select: { id: true, amount: true, status: true, reference: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        subscription: true,
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    res.status(200).json({
      ...property,
      images: safeJsonParse(property.images, []),
      amenities: safeJsonParse(property.amenities, []),
      includedUtilities: safeJsonParse(property.includedUtilities, [])
    });
  } catch (error) {
    console.error('Error fetching property by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePropertyApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { approvalStatus } = req.body; // PENDING, APPROVED, REJECTED

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(approvalStatus)) {
      res.status(400).json({ message: 'Invalid approval status' });
      return;
    }

    const oldProperty = await prisma.property.findUnique({ where: { id } });
    if (!oldProperty) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        approvalStatus,
        ...(approvalStatus === 'REJECTED' ? { isAvailable: false } : {})
      },
      include: { landlord: { select: { id: true, email: true, firstName: true } } }
    });

    await logAudit(
      req.user.id,
      approvalStatus === 'APPROVED' ? 'APPROVE_PROPERTY' : (approvalStatus === 'REJECTED' ? 'REJECT_PROPERTY' : 'PENDING_PROPERTY'),
      'Property',
      id,
      { approvalStatus: oldProperty.approvalStatus },
      { approvalStatus },
      req.ip || req.socket.remoteAddress
    );

    // Notify the landlord about their listing decision
    if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') {
      await notifyPropertyApproval({
        landlordId: property.landlord.id,
        landlordEmail: property.landlord.email,
        landlordName: property.landlord.firstName,
        propertyTitle: property.title,
        status: approvalStatus as 'APPROVED' | 'REJECTED'
      });
    }

    // Invalidate properties cache
    const keys = appCache.keys();
    const propertyKeys = keys.filter(k => k.startsWith('properties_'));
    appCache.del(propertyKeys);

    // Emit real-time property update to landlord and globally so public listings refresh
    try {
      getIO().emit('property_updated', { propertyId: id, approvalStatus });
      getIO().to(property.landlord.id).emit('property_updated', { propertyId: id, approvalStatus });
      getIO().to(property.landlord.id).emit('notification', {
        title: approvalStatus === 'APPROVED' ? '🎉 Property Listing Approved!' : '❌ Property Listing Rejected',
        message: approvalStatus === 'APPROVED'
          ? `Your listing "${property.title}" has been approved. Pay the listing fee to go live!`
          : `Your listing "${property.title}" was rejected. Please review the guidelines and resubmit.`,
        type: 'property'
      });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ message: `Property status updated to ${approvalStatus}`, property });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ── BULK MODERATION FOR PROPERTY LISTINGS (PEAK INTAKE WORKFLOW) ──
 * Allows multi-select bulk approval, rejection, or revision requests for properties
 * with a shared moderation note dispatched to landlords (Act 843 compliant).
 */
export const bulkUpdatePropertyApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyIds, approvalStatus, moderationNote } = req.body;

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      res.status(400).json({ message: 'propertyIds array cannot be empty.' });
      return;
    }

    const validStatuses = ['APPROVED', 'REJECTED', 'PENDING'];
    if (!validStatuses.includes(approvalStatus)) {
      res.status(400).json({ message: 'Invalid approval status. Must be APPROVED, REJECTED, or PENDING.' });
      return;
    }

    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      include: { landlord: { select: { id: true, email: true, firstName: true } } }
    });

    if (properties.length === 0) {
      res.status(404).json({ message: 'No matching properties found.' });
      return;
    }

    // Update all matching properties
    const updatedCount = await prisma.property.updateMany({
      where: { id: { in: propertyIds } },
      data: {
        approvalStatus,
        ...(approvalStatus === 'REJECTED' ? { isAvailable: false } : {})
      }
    });

    // Log audits and dispatch notifications for each property
    for (const prop of properties) {
      try {
        await logAudit(
          req.user.id,
          approvalStatus === 'APPROVED' ? 'BULK_APPROVE_PROPERTY' : 'BULK_REJECT_PROPERTY',
          'Property',
          prop.id,
          { approvalStatus: prop.approvalStatus },
          { approvalStatus, moderationNote },
          req.ip || 'ADMIN_CONSOLE'
        );
      } catch (e) {}

      // Notify landlord if applicable
      if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') {
        notifyPropertyApproval({
          landlordId: prop.landlord.id,
          landlordEmail: prop.landlord.email,
          landlordName: prop.landlord.firstName,
          propertyTitle: prop.title,
          status: approvalStatus as 'APPROVED' | 'REJECTED'
        }).catch(() => {});
      }

      // If moderationNote is provided, create an in-app notification
      if (moderationNote && prop.landlord?.id) {
        prisma.notification.create({
          data: {
            userId: prop.landlord.id,
            type: 'PROPERTY_ALERT',
            title: approvalStatus === 'APPROVED' ? 'Listing Approved (Bulk Intake Review)' : 'Listing Status Update',
            message: `Property "${prop.title}": ${moderationNote}`,
            link: `/dashboard/landlord/properties/${prop.id}`
          }
        }).catch(() => {});
      }
    }

    // Invalidate properties cache
    const keys = appCache.keys();
    const propertyKeys = keys.filter(k => k.startsWith('properties_'));
    appCache.del(propertyKeys);

    // Emit real-time socket events
    try {
      emitToAll('properties_updated', { count: updatedCount.count, status: approvalStatus });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedCount.count} listing${updatedCount.count !== 1 ? 's' : ''} to ${approvalStatus}.`,
      updatedCount: updatedCount.count
    });
  } catch (error) {
    console.error('Error in bulkUpdatePropertyApproval:', error);
    res.status(500).json({ message: 'Failed to bulk moderate properties.' });
  }
};

/**
 * ── TOGGLE PROPERTY PHYSICAL VERIFICATION BADGE ──
 */
export const togglePropertyPhysicalVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isPhysicallyVerified } = req.body;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        isPhysicallyVerified: Boolean(isPhysicallyVerified),
        physicalVerifiedAt: Boolean(isPhysicallyVerified) ? new Date() : null
      }
    });

    await logAudit(
      req.user.id,
      Boolean(isPhysicallyVerified) ? 'PROPERTY_PHYSICAL_VERIFICATION_GRANTED' : 'PROPERTY_PHYSICAL_VERIFICATION_REVOKED',
      'Property',
      id,
      { isPhysicallyVerified: property.isPhysicallyVerified },
      { isPhysicallyVerified: Boolean(isPhysicallyVerified) },
      req.ip || 'ADMIN_CONSOLE'
    );

    res.status(200).json({
      message: Boolean(isPhysicallyVerified) ? 'Property marked as physically verified' : 'Physical verification badge revoked',
      property: updated
    });
  } catch (error) {
    console.error('Error toggling physical verification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        tenant: { 
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } 
        },
        property: { 
          select: { 
            id: true, 
            title: true, 
            location: true, 
            price: true, 
            pricePeriod: true,
            type: true,
            landlord: { 
              select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } 
            } 
          } 
        },
        room: { 
          select: { id: true, blockName: true, roomType: true, bedsPerRoom: true, price: true } 
        },
        roomUnit: { 
          select: { unitNumber: true } 
        },
        transaction: { 
          select: { id: true, amount: true, status: true, reference: true, createdAt: true } 
        },
        leaseAgreement: { 
          select: { id: true, status: true, tenantSignedAt: true, landlordSignedAt: true, cryptographicHash: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true, studentId: true, campus: true }
        },
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true, isSuspended: true } }
          }
        },
        room: true,
        roomUnit: true,
        bed: true,
        leaseAgreement: true,
        transaction: true,
        review: true
      }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllReviews = async (req: Request, res: Response): Promise<void> => { 
  try { 
    const reviews = await prisma.review.findMany({ 
      include: { 
        author: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } }, 
        booking: { 
          include: { 
            property: { 
              select: { 
                id: true, 
                title: true, 
                location: true,
                type: true,
                images: true,
                landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true, isSuspended: true } }
              } 
            } 
          } 
        } 
      }, 
      orderBy: { createdAt: 'desc' } 
    }); 
    res.status(200).json(reviews); 
  } catch (error) { 
    res.status(500).json({ message: 'Internal server error' }); 
  } 
};

export const getReviewById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true } },
        booking: {
          include: {
            property: {
              include: {
                landlord: { select: { id: true, firstName: true, lastName: true, email: true } }
              }
            }
          }
        }
      }
    });

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.status(200).json(review);
  } catch (error) {
    console.error('Error fetching review by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.review.delete({ where: { id } });
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
