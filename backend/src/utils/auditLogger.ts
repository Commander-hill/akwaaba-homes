import prisma from './prisma';

export const logAudit = async (
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  oldData: any = null,
  newData: any = null,
  ipAddress: string = 'Unknown'
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Audit Logger Error:', error);
    // In production, we should probably write to a flat file if the DB fails to ensure the trail isn't lost.
  }
};
