require('dotenv').config();
// Import the compiled `prisma` instance from the project's config (uses adapter).
const { prisma } = require('../dist/src/config/prisma');

async function main(){
  console.log('prisma keys:', Object.keys(prisma));
  const mentions = await prisma.mention.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, fromUserId: true, postId: true, userId: true, createdAt: true }
  });

  console.log('Recent mentions:');
  console.log(JSON.stringify(mentions, null, 2));

  const countNotNull = await prisma.mention.count({ where: { fromUserId: { not: null } } });
  const countNull = await prisma.mention.count({ where: { fromUserId: null } });
  console.log(`count with fromUserId NOT NULL: ${countNotNull}`);
  console.log(`count with fromUserId NULL: ${countNull}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
