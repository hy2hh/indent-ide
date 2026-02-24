import { describe, it, expect } from 'vitest';
import { MyersDiff } from './MyersDiff.js';

describe('MyersDiff', () => {
  const differ = new MyersDiff();

  it('should return empty hunks for identical content', () => {
    const hunks = differ.compute('hello\nworld\n', 'hello\nworld\n');
    const changed = hunks.filter((h) => h.operation !== 'equal');
    expect(changed).toHaveLength(0);
  });

  it('should detect a single line addition', () => {
    const hunks = differ.compute('line1\n', 'line1\nline2\n');
    const added = hunks.filter((h) => h.operation === 'insert');
    expect(added.length).toBeGreaterThan(0);
  });

  it('should detect a single line deletion', () => {
    const hunks = differ.compute('line1\nline2\n', 'line1\n');
    const deleted = hunks.filter((h) => h.operation === 'delete');
    expect(deleted.length).toBeGreaterThan(0);
  });

  it('should detect modification', () => {
    const hunks = differ.compute('hello\n', 'world\n');
    const changed = hunks.filter((h) => h.operation !== 'equal');
    expect(changed.length).toBeGreaterThan(0);
  });

  it('should handle empty before', () => {
    const hunks = differ.compute('', 'new content\n');
    const changed = hunks.filter((h) => h.operation !== 'equal');
    expect(changed.length).toBeGreaterThan(0);
  });

  it('should handle empty after', () => {
    const hunks = differ.compute('old content\n', '');
    const changed = hunks.filter((h) => h.operation !== 'equal');
    expect(changed.length).toBeGreaterThan(0);
  });
});
