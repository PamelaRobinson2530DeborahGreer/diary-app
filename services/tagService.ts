// services/tagService.ts
import { Tag, TagID } from '@/models/entry';
import localforage from 'localforage';

const tagStore = localforage.createInstance({
  name: 'journal-app',
  storeName: 'tags'
});

class TagService {
  private tags: Map<TagID, Tag> = new Map();
  private loaded = false;

  private async persistTag(tag: Tag): Promise<Tag> {
    await tagStore.setItem(tag.id, tag);
    this.tags.set(tag.id, tag);
    this.loaded = true;
    return tag;
  }

  async loadTags(): Promise<Tag[]> {
    if (this.loaded) {
      return Array.from(this.tags.values());
    }

    const tags: Tag[] = [];
    await tagStore.iterate<Tag, void>((value) => {
      tags.push(value);
      this.tags.set(value.id, value);
    });

    this.loaded = true;
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTag(id: TagID): Promise<Tag | null> {
    if (!this.loaded) {
      await this.loadTags();
    }
    return this.tags.get(id) || null;
  }

  async createTag(name: string, color: string, icon?: string): Promise<Tag> {
    const now = new Date().toISOString();
    const tag: Tag = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      icon,
      createdAt: now,
      updatedAt: now
    };
    return this.persistTag(tag);
  }

  async updateTag(id: TagID, updates: Partial<Pick<Tag, 'name' | 'color' | 'icon'>>): Promise<Tag | null> {
    const tag = await this.getTag(id);
    if (!tag) return null;

    const updatedTag: Tag = {
      ...tag,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.persistTag(updatedTag);
  }

  async deleteTag(id: TagID): Promise<boolean> {
    const tag = await this.getTag(id);
    if (!tag) return false;

    await tagStore.removeItem(id);
    this.tags.delete(id);
    return true;
  }

  async importTag(tag: Tag): Promise<Tag> {
    const normalized: Tag = {
      ...tag,
      name: tag.name.trim(),
      createdAt: tag.createdAt ?? new Date().toISOString(),
      updatedAt: tag.updatedAt ?? tag.createdAt ?? new Date().toISOString()
    };

    return this.persistTag(normalized);
  }

  async searchTags(query: string): Promise<Tag[]> {
    const allTags = await this.loadTags();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return allTags;

    return allTags.filter(tag =>
      tag.name.toLowerCase().includes(lowerQuery)
    );
  }

  async getTagsByIds(ids: TagID[]): Promise<Tag[]> {
    await this.loadTags();
    return ids.map(id => this.tags.get(id)).filter((t): t is Tag => t !== undefined);
  }

  clearCache(): void {
    this.tags.clear();
    this.loaded = false;
  }
}

export const tagService = new TagService();
