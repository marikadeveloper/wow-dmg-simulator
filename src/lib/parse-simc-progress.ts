/**
 * Parse SimC stderr output for profileset progress.
 *
 * SimC outputs progress in various formats. The most reliable pattern
 * for ProfileSet runs is a line containing "N/M" where N is current
 * and M is total profilesets completed.
 *
 * Common patterns:
 *   "Profilesets (work_threads=2): 5/42"
 *   "5/42"
 *   "Generating profilesets: 12/100"
 *
 * Returns { current, total } if a progress pattern is found, null otherwise.
 */
export function parseSimcProgress(
  line: string,
): { current: number; total: number } | null {
  // Match patterns like "N/M" where both N and M are positive integers
  // Look for the last such pattern in the line (most specific)
  const matches = [...line.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
  if (matches.length === 0) return null;

  // Use the last match (most likely the actual progress, not part of a path)
  const match = matches[matches.length - 1];
  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);

  // Sanity: total must be > 0 and current <= total
  if (total <= 0 || current > total) return null;

  return { current, total };
}
