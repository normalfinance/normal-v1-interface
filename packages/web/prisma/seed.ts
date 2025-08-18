import { PrismaClient } from '@prisma/client';
import { InviteCodeGenerator } from '../src/lib/invite-code-generator';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const initialCodeCount = 100;
  console.log(`📝 Generating ${initialCodeCount} invite codes...`);

  try {
    const codes = await InviteCodeGenerator.generateCodes(initialCodeCount, 'seed');
    console.log(`✅ Generated ${codes.length} invite codes`);

    console.log('📋 Sample codes:');
    codes.slice(0, 5).forEach((code, index) => {
      console.log(`   ${index + 1}. ${code}`);
    });

    const stats = await InviteCodeGenerator.getUsageStats();
    console.log('📊 Current stats:', stats);
  } catch (error) {
    console.error('❌ Error generating invite codes:', error);
    throw error;
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
