/**
 * Simple glob/minimatch implementation for matching file paths against patterns.
 * Supports: *, **, ?, and {a,b} braces.
 */
export function minimatch(filePath: string, pattern: string): boolean {
  // Normalize separators
  const normalized = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Strip leading **/ from pattern for basename matching
  const stripped = normalizedPattern.replace(/^\*\*\//, '');

  // Try matching against full path and just the filename
  return globMatch(normalized, normalizedPattern) || globMatch(normalized, stripped);
}

function globMatch(str: string, pattern: string): boolean {
  // Expand braces {a,b,c} into alternatives
  const braceMatch = pattern.match(/\{([^}]+)\}/);
  if (braceMatch) {
    const alternatives = braceMatch[1].split(',');
    return alternatives.some((alt) => {
      const expanded = pattern.replace(braceMatch[0], alt);
      return globMatch(str, expanded);
    });
  }

  // Convert glob to regex
  let regexStr = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          regexStr += '(?:.+/)?';
          i += 3;
        } else {
          regexStr += '.*';
          i += 2;
        }
      } else {
        regexStr += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      regexStr += '[^/]';
      i++;
    } else if (c === '.') {
      regexStr += '\\.';
      i++;
    } else {
      regexStr += c;
      i++;
    }
  }

  return new RegExp(`^${regexStr}$`, 'i').test(str);
}
