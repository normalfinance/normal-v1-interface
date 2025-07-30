import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Append to logs.txt file
    const logFilePath = path.join(logsDir, 'logs.txt');
    fs.appendFileSync(logFilePath, message + '\n');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logging error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to log message' }, { status: 500 });
  }
}
