// app/api/sync/changes/route.ts
// API endpoint for getting incremental changes since last sync

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const since = searchParams.get('since'); // ISO timestamp
    const deviceId = searchParams.get('deviceId'); // Current device ID

    // Validation
    if (!userId || !since) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    logger.log(`[API] Getting changes for user ${userId} since ${since}`);

    const sinceDate = new Date(since);

    // Fetch entries updated after 'since' time
    // Exclude entries last updated by the current device to avoid circular sync
    const where: Prisma.SyncEntryWhereInput = {
      userId,
      updatedAt: {
        gt: sinceDate
      }
    };

    // Optionally exclude current device's changes
    if (deviceId) {
      where.deviceId = {
        not: deviceId
      };
    }

    const changes = await prisma.syncEntry.findMany({
      where,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    logger.log(`[API] Found ${changes.length} changes`);

    // Transform for response
    const responseChanges = changes.map(entry => ({
      id: entry.id,
      version: entry.version,
      encryptedData: entry.encryptedData,
      encryptedTitle: entry.encryptedTitle,
      mood: entry.mood,
      hasPhoto: entry.hasPhoto,
      deleted: entry.deleted,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      vectorClock: entry.vectorClock,
      deviceId: entry.deviceId
    }));

    return NextResponse.json({
      changes: responseChanges,
      count: responseChanges.length,
      since: sinceDate.toISOString()
    });

  } catch (error) {
    logger.error('[API] Get changes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
