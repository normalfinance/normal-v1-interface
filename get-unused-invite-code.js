#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getUnusedInviteCode() {
  try {
    const unusedCode = await prisma.testnetUser.findFirst({
      where: { 
        isUsed: false 
      },
      orderBy: { 
        createdAt: 'asc' 
      },
      select: {
        inviteCode: true,
        createdAt: true,
        source: true
      }
    });

    if (!unusedCode) {
      console.log('No unused invite codes available');
      return null;
    }

    console.log(`Invite Code: ${unusedCode.inviteCode}`);
    console.log(`Created: ${unusedCode.createdAt}`);
    console.log(`Source: ${unusedCode.source || 'N/A'}`);
    
    return unusedCode.inviteCode;
  } catch (error) {
    console.error('Error fetching unused invite code:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  getUnusedInviteCode();
}

module.exports = { getUnusedInviteCode };