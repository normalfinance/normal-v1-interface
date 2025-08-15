import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';
import { InviteCodeService } from '@/lib/invite-code-service';
import { InviteCodeGenerator } from '@/lib/invite-code-generator';

// Simple auth check - in production you'd want proper admin authentication
function isAdminRequest(request: NextRequest): boolean {
  // For now, just check for a simple admin header
  // In production, implement proper admin authentication
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV === 'development';
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (action === 'stats') {
      // Get usage statistics
      const stats = await InviteCodeGenerator.getUsageStats();
      const recentActivity = await InviteCodeService.getRecentActivity();

      return NextResponse.json({
        stats,
        recentActivity,
      });
    } else if (action === 'list') {
      // Get paginated list of codes
      const result = await InviteCodeGenerator.getAllCodes(page, limit);
      return NextResponse.json(result);
    } else {
      // Default: return stats
      const stats = await InviteCodeGenerator.getUsageStats();
      return NextResponse.json({ stats });
    }
  } catch (error) {
    console.error('GET /api/admin/invite-codes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, count = 10, source = 'admin' } = body;

    if (action === 'generate') {
      if (count > 1000) {
        return NextResponse.json(
          { error: 'Cannot generate more than 1000 codes at once' },
          { status: 400 }
        );
      }

      const codes = await InviteCodeGenerator.generateCodes(count, source);
      const stats = await InviteCodeGenerator.getUsageStats();

      return NextResponse.json({
        success: true,
        message: `Successfully generated ${codes.length} invite codes`,
        codes,
        stats,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "generate"' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/admin/invite-codes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
