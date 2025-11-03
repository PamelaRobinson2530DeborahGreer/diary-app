// app/api/sync/setup/route.ts
// API endpoint for setting up cloud sync

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      encryptedMasterKey,
      syncSalt,
      syncPasswordHash,
      deviceName,
      deviceInfo
    } = body;

    // Validation
    if (!encryptedMasterKey || !syncSalt || !syncPasswordHash || !deviceName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.log('[API] Setting up sync for new user');

    // Create user
    const user = await prisma.user.create({
      data: {
        encryptedMasterKey,
        syncSalt,
        syncPasswordHash
      }
    });

    logger.log('[API] User created:', user.id);

    // Create device
    const device = await prisma.device.create({
      data: {
        userId: user.id,
        deviceName,
        deviceInfo: deviceInfo || {},
        lastSyncAt: new Date()
      }
    });

    logger.log('[API] Device created:', device.id);

    return NextResponse.json({
      userId: user.id,
      deviceId: device.id,
      message: 'Sync setup successful'
    });

  } catch (error) {
    logger.error('[API] Setup sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
