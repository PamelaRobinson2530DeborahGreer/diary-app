// app/api/sync/login/route.ts
// API endpoint for logging into cloud sync from new device

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { syncPasswordHash, deviceName, deviceInfo } = body;

    // Validation
    if (!syncPasswordHash || !deviceName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.log('[API] Login sync request');

    // Find user by password hash
    const user = await prisma.user.findFirst({
      where: {
        syncPasswordHash
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid sync password' },
        { status: 401 }
      );
    }

    logger.log('[API] User found:', user.id);

    // Create new device for this login
    const device = await prisma.device.create({
      data: {
        userId: user.id,
        deviceName,
        deviceInfo: deviceInfo || {},
        lastSyncAt: new Date()
      }
    });

    logger.log('[API] New device created:', device.id);

    return NextResponse.json({
      userId: user.id,
      deviceId: device.id,
      encryptedMasterKey: user.encryptedMasterKey,
      syncSalt: user.syncSalt,
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('[API] Login sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
