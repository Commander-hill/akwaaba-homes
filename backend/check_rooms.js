const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRooms() {
  const rooms = await prisma.room.findMany({
    include: {
      property: { select: { title: true } }
    }
  });

  console.log(`Found ${rooms.length} rooms in DB:`);
  for (const r of rooms) {
    console.log(`ID: ${r.id} | Property: "${r.property?.title}" | RoomType: "${r.roomType}" | numberOfRooms: ${r.numberOfRooms} | bedsPerRoom: ${r.bedsPerRoom}`);
  }
  await prisma.$disconnect();
}

checkRooms().catch(console.error);
