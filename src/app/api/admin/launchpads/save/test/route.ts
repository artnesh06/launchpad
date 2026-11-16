import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  return NextResponse.json({
    success: true,
    message: 'Save endpoint is working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  return NextResponse.json({
    success: true,
    message: 'POST to save endpoint is working!',
    timestamp: new Date().toISOString()
  });
}
