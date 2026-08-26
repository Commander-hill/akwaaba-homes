const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseBedsPerRoom(roomType) {
  if (!roomType) return 1;
  const str = roomType.toLowerCase().trim();
  if (str.includes('4') || str.includes('four')) return 4;
  if (str.includes('3') || str.includes('three')) return 3;
  if (str.includes('2') || str.includes('two') || str.includes('double') || str.includes('twin')) return 2;
  if (str.includes('1') || str.includes('one') || str.includes('single')) return 1;
  const match = str.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return 1;
}

async function testCapacity() {
  const properties = await prisma.property.findMany({
    include: {
      rooms: {
        include: {
          roomUnits: {
            include: { beds: true }
          }
        }
      }
    }
  });

  for (const p of properties) {
    let totalCapacity = 0;
    let totalRoomsCount = 0;
    let totalBedsCountInUnits = 0;

    for (const r of p.rooms) {
      const beds = r.bedsPerRoom || parseBedsPerRoom(r.roomType);
      totalRoomsCount += r.numberOfRooms;
      totalCapacity += r.numberOfRooms * beds;

      for (const unit of r.roomUnits) {
        totalBedsCountInUnits += unit.beds.length;
      }
    }

    console.log(`Property: "${p.title}" (ID: ${p.id})`);
    console.log(`  Total Room Types: ${p.rooms.length}`);
    console.log(`  Total Physical Rooms (numberOfRooms): ${totalRoomsCount}`);
    console.log(`  Calculated Total Capacity (beds): ${totalCapacity}`);
    console.log(`  Total Beds created in RoomUnits: ${totalBedsCountInUnits}`);
    console.log('---');
  }

  await prisma.$disconnect();
}

testCapacity().catch(console.error);
