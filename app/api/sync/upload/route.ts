// app/api/sync/upload/route.ts
// API endpoint for uploading encrypted entries to cloud

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceId, entries } = body;

    // Validation
    if (!userId || !deviceId || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    logger.log(`[API] Uploading ${entries.length} entries for user ${userId}`);

    // Verify user and device exist
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Invalid user or device' },
        { status: 403 }
      );
    }

    // Upsert entries (create or update)
    const upsertPromises = entries.map((entry: any) =>
      prisma.syncEntry.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          userId,
          deviceId,
          version: entry.version || 1,
          encryptedData: entry.encryptedData,
          encryptedTitle: entry.encryptedTitle,
          mood: entry.mood,
          hasPhoto: entry.hasPhoto || false,
          deleted: entry.deleted || false,
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt),
          vectorClock: entry.vectorClock || { [deviceId]: 1 }
        },
        update: {
          deviceId,
          version: { increment: 1 },
          encryptedData: entry.encryptedData,
          encryptedTitle: entry.encryptedTitle,
          mood: entry.mood,
          hasPhoto: entry.hasPhoto || false,
          deleted: entry.deleted || false,
          updatedAt: new Date(entry.updatedAt),
          vectorClock: entry.vectorClock
        }
      })
    );

    await Promise.all(upsertPromises);

    // Update device last sync time
    await prisma.device.update({
      where: { id: deviceId },
      data: { lastSyncAt: new Date() }
    });

    // Log sync history
    await prisma.syncHistory.create({
      data: {
        userId,
        deviceId,
        action: 'upload',
        entriesCount: entries.length,
        conflictsCount: 0,
        status: 'success'
      }
    });

    logger.log(`[API] Successfully uploaded ${entries.length} entries`);

    return NextResponse.json({
      success: true,
      entriesUploaded: entries.length,
      message: 'Entries uploaded successfully'
    });

  } catch (error) {
    logger.error('[API] Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
