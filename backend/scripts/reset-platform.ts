import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TARGET_ADMIN_EMAIL = 'israelboateng5@gmail.com';
const prisma = new PrismaClient();

function assertLocalDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL || '';
  const allowRemote = process.argv.includes('--force-remote');
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/i.test(dbUrl);
  if (!isLocal && !allowRemote) {
    throw new Error(
      `Refusing to reset non-local DATABASE_URL (${dbUrl.replace(/:\/\/[^@]+@/, '://***@')}). Pass --force-remote to override.`
    );
  }
}

async function clearCloudinaryPrefix(prefix: string) {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    console.log('CLOUDINARY_URL not set; skipping Cloudinary cleanup.');
    return { deletedByType: {} as Record<string, number> };
  }

  const parsed = new URL(cloudinaryUrl);
  cloudinary.config({
    cloud_name: parsed.hostname,
    api_key: parsed.username,
    api_secret: parsed.password,
    secure: true,
  });

  const resourceTypes: Array<'image' | 'video' | 'raw'> = ['image', 'video', 'raw'];
  const deletedByType: Record<string, number> = {};

  for (const resourceType of resourceTypes) {
    let totalDeleted = 0;
    let partial = true;
    while (partial) {
      const res = await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: resourceType,
      });
      const deletedMap = res?.deleted || {};
      const count = Object.values(deletedMap).filter((status) => status === 'deleted').length;
      totalDeleted += count;
      partial = Boolean(res?.partial);
      if (count === 0) break;
    }
    deletedByType[resourceType] = totalDeleted;
  }

  // Clean up empty subfolders under `akwaaba` if present
  try {
    const folderName = prefix.replace(/\/+$/, '');
    const sub = await cloudinary.api.sub_folders(folderName);
    for (const f of sub?.folders || []) {
      try {
        await cloudinary.api.delete_folder(f.path);
      } catch {
        // Ignore if folder still has non-empty nested assets or doesn't exist
      }
    }
  } catch {
    // Ignore if root folder does not exist
  }

  return { deletedByType };
}

function clearLocalUploadsDir() {
  const uploadsDir = path.resolve(__dirname, '../public/uploads');
  if (!fs.existsSync(uploadsDir)) return 0;

  let removed = 0;
  for (const entry of fs.readdirSync(uploadsDir)) {
    const fullPath = path.join(uploadsDir, entry);
    fs.rmSync(fullPath, { recursive: true, force: true });
    removed++;
  }
  return removed;
}

async function main() {
  assertLocalDatabaseUrl();

  const admin = await prisma.user.findFirst({
    where: {
      email: { equals: TARGET_ADMIN_EMAIL, mode: 'insensitive' },
    },
    select: { id: true, email: true, role: true, avatarUrl: true },
  });

  if (!admin) {
    throw new Error(`Admin account "${TARGET_ADMIN_EMAIL}" was not found. Aborting reset.`);
  }
  if (admin.role !== 'ADMIN') {
    throw new Error(`Account "${admin.email}" has role "${admin.role}", expected "ADMIN". Aborting reset.`);
  }

  const deletedCounts = await prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};

    counts.billSplitParticipant = (await tx.billSplitParticipant.deleteMany()).count;
    counts.billSplit = (await tx.billSplit.deleteMany()).count;
    counts.packageDelivery = (await tx.packageDelivery.deleteMany()).count;
    counts.leaseRenewalRequest = (await tx.leaseRenewalRequest.deleteMany()).count;
    counts.vehicleRegistration = (await tx.vehicleRegistration.deleteMany()).count;
    counts.serviceBooking = (await tx.serviceBooking.deleteMany()).count;
    counts.visitorPass = (await tx.visitorPass.deleteMany()).count;
    counts.propertyStaff = (await tx.propertyStaff.deleteMany()).count;
    counts.inspectionChecklist = (await tx.inspectionChecklist.deleteMany()).count;
    counts.compoundNotice = (await tx.compoundNotice.deleteMany()).count;
    counts.propertyExpense = (await tx.propertyExpense.deleteMany()).count;
    counts.wishlist = (await tx.wishlist.deleteMany()).count;
    counts.roommateInvitation = (await tx.roommateInvitation.deleteMany()).count;
    counts.maintenanceSubscriber = (await tx.maintenanceSubscriber.deleteMany()).count;
    counts.pushSubscription = (await tx.pushSubscription.deleteMany()).count;
    counts.payoutRequest = (await tx.payoutRequest.deleteMany()).count;
    counts.transaction = (await tx.transaction.deleteMany()).count;
    counts.breachReport = (await tx.breachReport.deleteMany()).count;
    counts.message = (await tx.message.deleteMany()).count;
    counts.conversation = (await tx.conversation.deleteMany()).count;
    counts.maintenanceTicket = (await tx.maintenanceTicket.deleteMany()).count;
    counts.notice = (await tx.notice.deleteMany()).count;
    counts.auditLog = (await tx.auditLog.deleteMany()).count;
    counts.session = (await tx.session.deleteMany()).count;
    counts.notification = (await tx.notification.deleteMany()).count;
    counts.propertySubscription = (await tx.propertySubscription.deleteMany()).count;
    counts.review = (await tx.review.deleteMany()).count;
    counts.leaseAgreement = (await tx.leaseAgreement.deleteMany()).count;
    counts.booking = (await tx.booking.deleteMany()).count;
    counts.bed = (await tx.bed.deleteMany()).count;
    counts.roomUnit = (await tx.roomUnit.deleteMany()).count;
    counts.room = (await tx.room.deleteMany()).count;
    counts.roommateProfile = (await tx.roommateProfile.deleteMany()).count;
    counts.property = (await tx.property.deleteMany()).count;

    counts.systemConfig = (await tx.systemConfig.deleteMany()).count;
    counts.nonAdminUsers = (
      await tx.user.deleteMany({
        where: { id: { not: admin.id } },
      })
    ).count;

    if (admin.avatarUrl) {
      await tx.user.update({
        where: { id: admin.id },
        data: { avatarUrl: null },
      });
    }

    await tx.systemConfig.create({ data: { id: 'GLOBAL' } });
    return counts;
  });

  const cloudinaryResult = await clearCloudinaryPrefix('akwaaba/');
  const localUploadsRemoved = clearLocalUploadsDir();

  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  const remainingConfig = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });

  console.log('=== Local Platform Reset Complete ===');
  console.log('Deleted DB rows:', JSON.stringify(deletedCounts, null, 2));
  console.log('Deleted Cloudinary assets (akwaaba/):', JSON.stringify(cloudinaryResult.deletedByType));
  console.log('Removed local upload entries:', localUploadsRemoved);
  console.log('Remaining users:', JSON.stringify(remainingUsers));
  console.log('Reset SystemConfig ID:', remainingConfig?.id);
}

main()
  .catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
