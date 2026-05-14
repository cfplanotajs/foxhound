type VersionRow = { version: string };

export function parsePresetVersionNumber(versionTag: string): number | null {
  const match = /^v(\d+)$/.exec(versionTag.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function getNextPresetVersionTag(versions: VersionRow[]): string {
  const maxVersion = versions.reduce((max, row) => {
    const parsed = parsePresetVersionNumber(row.version);
    return parsed && parsed > max ? parsed : max;
  }, 0);
  return `v${maxVersion + 1}`;
}
