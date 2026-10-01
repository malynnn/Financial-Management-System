import { PrismaClient, CollectionStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding collections for Treasurer testing...');

  // Get some members
  const members = await prisma.user.findMany({
    where: { role: 'MEMBER' },
    take: 3,
  });

  if (members.length === 0) {
    console.log('No members found. Run npm run prisma:seed first to generate members.');
    return;
  }

  const collectionsData = [];
  
  // Pending collection 1
  collectionsData.push({
    memberId: members[0].id,
    paymentAmount: 1500.50,
    paymentDate: new Date(),
    paymentMethod: PaymentMethod.GCASH,
    paymentReference: 'GCASH-100234',
    description: 'Payment for Annual Dues',
    status: CollectionStatus.PENDING,
    collectionRefNo: 'CR-10001'
  });

  // Pending collection 2
  collectionsData.push({
    memberId: members[1]?.id || members[0].id,
    paymentAmount: 5000.00,
    paymentDate: new Date(),
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    paymentReference: 'BDO-554123',
    description: 'Emergency Loan Repayment',
    status: CollectionStatus.PENDING,
    collectionRefNo: 'CR-10002'
  });

  // For Verification collection 3
  collectionsData.push({
    memberId: members[2]?.id || members[0].id,
    paymentAmount: 750.00,
    paymentDate: new Date(),
    paymentMethod: PaymentMethod.CASH,
    paymentReference: '',
    description: 'Donation',
    status: CollectionStatus.FOR_VERIFICATION,
    collectionRefNo: 'CR-10003'
  });

  for (const data of collectionsData) {
    const col = await prisma.collection.create({
      data: {
        ...data,
        auditTrail: {
          create: {
            userId: data.memberId,
            action: 'Collection Record Created',
            newStatus: data.status,
            actor: 'System Seeder',
            role: 'System',
            details: `Seeded ${data.status} collection for testing.`,
          }
        }
      }
    });
    console.log(`Created collection: ${col.id} - ${col.status}`);
  }

  console.log('Finished seeding collections.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
