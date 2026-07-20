import { describe, it, expect } from 'vitest';
import { detectUpdates } from '../src/background.js';
import type { TopicCatalogItem } from '../src/types.js';

const makeItem = (id: string, version: string): TopicCatalogItem => ({
  id,
  title: id,
  description: 'd',
  version,
  downloadUrl: `https://gist.githubusercontent.com/u/${id}`,
});

describe('detectUpdates', () => {
  it('returns true when catalog item is newer', () => {
    const versions = { js: '1.0.0' };
    const topics = [makeItem('js', '2.0.0')];
    expect(detectUpdates(versions, topics)).toBe(true);
  });

  it('returns false when versions match', () => {
    const versions = { js: '2.0.0' };
    const topics = [makeItem('js', '2.0.0')];
    expect(detectUpdates(versions, topics)).toBe(false);
  });

  it('returns false when local version is newer', () => {
    const versions = { js: '3.0.0' };
    const topics = [makeItem('js', '2.0.0')];
    expect(detectUpdates(versions, topics)).toBe(false);
  });

  it('returns false when no versions downloaded', () => {
    expect(detectUpdates({}, [makeItem('js', '1.0.0')])).toBe(false);
  });

  it('returns false for item not in downloaded versions', () => {
    const versions = { ts: '1.0.0' };
    const topics = [makeItem('js', '1.0.0')];
    expect(detectUpdates(versions, topics)).toBe(false);
  });

  it('returns true if any item has update', () => {
    const versions = { js: '1.0.0', ts: '2.0.0' };
    const topics = [makeItem('js', '1.0.0'), makeItem('ts', '3.0.0')];
    expect(detectUpdates(versions, topics)).toBe(true);
  });

  it('returns false for empty catalog', () => {
    expect(detectUpdates({ js: '1.0.0' }, [])).toBe(false);
  });

  it('returns false for empty versions + empty catalog', () => {
    expect(detectUpdates({}, [])).toBe(false);
  });
});
