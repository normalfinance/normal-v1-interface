import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

export class InviteCodeGenerator {
  private static prisma = new PrismaClient();

  static async generateCodes(count: number, source: string = 'admin'): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code: string;
      let isUnique = false;

      //Collision check
      while (!isUnique) {
        code = this.generateSingleCode();
        isUnique = await this.isCodeUnique(code);
      }

      codes.push(code!);
    }

    // Insert all codes into database
    await this.prisma.testnetUser.createMany({
      data: codes.map((code) => ({
        inviteCode: code,
        source,
      })),
    });

    return codes;
  }

  private static generateSingleCode(): string {
    const bytes = randomBytes(3); // 3 bytes = 6 hex chars
    return 'NF' + bytes.toString('hex').toUpperCase();
  }

  private static async isCodeUnique(code: string): Promise<boolean> {
    const existing = await this.prisma.testnetUser.findUnique({
      where: { inviteCode: code },
    });
    return !existing;
  }

  static async getUsageStats() {
    const total = await this.prisma.testnetUser.count();
    const used = await this.prisma.testnetUser.count({
      where: { isUsed: true },
    });
    const unused = total - used;

    return {
      total,
      used,
      unused,
      usageRate: total > 0 ? (used / total) * 100 : 0,
    };
  }

  static async getAllCodes(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [codes, total] = await Promise.all([
      this.prisma.testnetUser.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testnetUser.count(),
    ]);

    return {
      codes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
