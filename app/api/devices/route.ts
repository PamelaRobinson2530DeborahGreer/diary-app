// app/api/devices/route.ts
// API endpoint for managing devices

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/utils/logger';

// GET: List all devices for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastSyncAt: 'desc' }
    });

    return NextResponse.json({ devices });

  } catch (error) {
    logger.error('[API] Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Register a new device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceName, deviceInfo } = body;

    if (!userId || !deviceName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const device = await prisma.device.create({
      data: {
        userId,
        deviceName,
        deviceInfo: deviceInfo || {},
        lastSyncAt: new Date()
      }
    });

    return NextResponse.json({
      device,
      message: 'Device registered successfully'
    });

  } catch (error) {
    logger.error('[API] Register device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a device
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    const userId = searchParams.get('userId');

    if (!deviceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify device belongs to user
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.device.delete({
      where: { id: deviceId }
    });

    return NextResponse.json({
      message: 'Device removed successfully'
    });

  } catch (error) {
    logger.error('[API] Delete device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
