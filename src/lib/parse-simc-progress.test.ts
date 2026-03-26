import { describe, it, expect } from 'vitest';
import { parseSimcProgress } from './parse-simc-progress';

describe('parseSimcProgress', () => {
  it('returns null for lines without progress', () => {
    expect(parseSimcProgress('Generating baseline...')).toBeNull();
    expect(parseSimcProgress('SimulationCraft 1100-01')).toBeNull();
    expect(parseSimcProgress('')).toBeNull();
  });

  it('parses "N/M" pattern', () => {
    expect(parseSimcProgress('5/42')).toEqual({ current: 5, total: 42 });
  });

  it('parses profileset progress line', () => {
    expect(parseSimcProgress('Profilesets (work_threads=2): 12/100')).toEqual({
      current: 12,
      total: 100,
    });
  });

  it('parses with spaces around slash', () => {
    expect(parseSimcProgress('Progress: 7 / 20')).toEqual({
      current: 7,
      total: 20,
    });
  });

  it('uses last match in line (avoids paths like /tmp/simc)', () => {
    expect(
      parseSimcProgress('/tmp/simc_input_abc.simc Profilesets: 3/10'),
    ).toEqual({ current: 3, total: 10 });
  });

  it('returns null if current > total', () => {
    expect(parseSimcProgress('15/10')).toBeNull();
  });

  it('returns null if total is 0', () => {
    expect(parseSimcProgress('0/0')).toBeNull();
  });

  it('parses completion (current equals total)', () => {
    expect(parseSimcProgress('42/42')).toEqual({ current: 42, total: 42 });
  });
});
