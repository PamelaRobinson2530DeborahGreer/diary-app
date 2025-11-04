// app/api/sync/download/route.ts
// API endpoint for downloading encrypted entries from cloud

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const since = searchParams.get('since'); // Optional: ISO timestamp for incremental sync

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    logger.log(`[API] Downloading entries for user ${userId}`);

    // Build where clause
    const where: Prisma.SyncEntryWhereInput = {
      userId,
      deleted: false // Don't download deleted entries by default
    };

    // If incremental sync, only get entries updated after 'since'
    if (since) {
      where.updatedAt = {
        gt: new Date(since)
      };
    }

    // Fetch entries
    const entries = await prisma.syncEntry.findMany({
      where,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    logger.log(`[API] Found ${entries.length} entries`);

    // Transform for response
    const responseEntries = entries.map(entry => ({
      id: entry.id,
      version: entry.version,
      encryptedData: entry.encryptedData,
      encryptedTitle: entry.encryptedTitle,
      mood: entry.mood,
      hasPhoto: entry.hasPhoto,
      deleted: entry.deleted,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      vectorClock: entry.vectorClock
    }));

    return NextResponse.json({
      entries: responseEntries,
      count: responseEntries.length
    });

  } catch (error) {
    logger.error('[API] Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
