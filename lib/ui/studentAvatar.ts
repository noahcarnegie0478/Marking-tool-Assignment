// Avatar colour pair for each student's initial-circle. The design ticket
// (UI-02-final-ui.md §1) pins exact colours for the four students in the
// real data set. A name outside that set falls back to a cycling palette
// so the app never crashes if the data changes, but the four fixed pairs
// are what the design actually specifies.
const FIXED_AVATARS: Record<string, { bg: string; color: string }> = {
  Aisha: { bg: "#FCE4E3", color: "#C0263A" },
  Ben: { bg: "#F3E6D4", color: "#A06A38" },
  Chen: { bg: "#E3EAF2", color: "#486585" },
  Diego: { bg: "#E6EFE2", color: "#4E7048" },
};

const FALLBACK_PALETTE: { bg: string; color: string }[] = Object.values(FIXED_AVATARS);

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function studentAvatarColors(name: string): { bg: string; color: string } {
  return FIXED_AVATARS[name] ?? FALLBACK_PALETTE[hashName(name) % FALLBACK_PALETTE.length];
}

export function studentInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
