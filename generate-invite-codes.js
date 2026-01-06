#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { randomBytes } = require('crypto')

const prisma = new PrismaClient()

class InviteCodeGenerator {
  static async generateCodes(count, source = 'manual') {
    const codes = []

    for (let i = 0; i < count; i++) {
      let code
      let isUnique = false

      // Collision check
      while (!isUnique) {
        code = this.generateSingleCode()
        isUnique = await this.isCodeUnique(code)
      }

      codes.push(code)
    }

    // Insert all codes into database
    await prisma.testnetUser.createMany({
      data: codes.map((code) => ({
        inviteCode: code,
        source,
      })),
    })

    return codes
  }

  static generateSingleCode() {
    const bytes = randomBytes(3) // 3 bytes = 6 hex chars
    return 'NF' + bytes.toString('hex').toUpperCase()
  }

  static async isCodeUnique(code) {
    const existing = await prisma.testnetUser.findUnique({
      where: { inviteCode: code },
    })
    return !existing
  }

  static async getUsageStats() {
    const total = await prisma.testnetUser.count()
    const used = await prisma.testnetUser.count({
      where: { isUsed: true },
    })
    const unused = total - used

    return {
      total,
      used,
      unused,
      usageRate: total > 0 ? (used / total) * 100 : 0,
    }
  }
}

async function main() {
  try {
    // Get count from command line argument, default to 50
    const count = parseInt(process.argv[2]) || 50
    const source = process.argv[3] || 'manual'

    console.log(`🔄 Generating ${count} new invite codes...`)

    // Show current stats before generation
    const statsBefore = await InviteCodeGenerator.getUsageStats()
    console.log('📊 Current stats before generation:', statsBefore)

    // Generate new codes
    const codes = await InviteCodeGenerator.generateCodes(count, source)
    console.log(`✅ Successfully generated ${codes.length} invite codes`)

    // Show sample codes
    console.log('\n📋 Sample generated codes:')
    codes.slice(0, Math.min(5, codes.length)).forEach((code, index) => {
      console.log(`   ${index + 1}. ${code}`)
    })

    // Show updated stats
    const statsAfter = await InviteCodeGenerator.getUsageStats()
    console.log('\n📊 Updated stats after generation:', statsAfter)

    console.log(`\n🎉 Successfully added ${count} new invite codes to the database!`)
  } catch (error) {
    console.error('❌ Error generating invite codes:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
