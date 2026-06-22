export type PosSauceOption = { id: string; name: string };

export function formatItemNote(userNote: string, sauceNames: string[]) {
  const trimmed = userNote.trim();
  const unique = [...new Set(sauceNames.map((n) => n.trim()).filter(Boolean))];
  if (!unique.length) return trimmed;
  const sauceLine = `صوصات: ${unique.join('، ')}`;
  return trimmed ? `${trimmed} · ${sauceLine}` : sauceLine;
}

export function parseItemNote(fullNote: string) {
  const trimmed = fullNote.trim();
  if (!trimmed) return { userNote: '', sauces: [] as string[] };

  const lines = trimmed.split('\n');
  const sauceLineIdx = lines.findIndex((l) => l.trimStart().startsWith('صوصات:'));
  if (sauceLineIdx >= 0) {
    const sauceLine = lines[sauceLineIdx] ?? '';
    const sauces = sauceLine
      .replace(/^صوصات:\s*/, '')
      .split('،')
      .map((s) => s.trim())
      .filter(Boolean);
    const userNote = lines.filter((_, i) => i !== sauceLineIdx).join('\n').trim();
    return { userNote, sauces };
  }

  const sauceMatch = trimmed.match(/(?:^|\s·\s)(صوصات:\s*.+)$/);
  if (!sauceMatch) return { userNote: trimmed, sauces: [] as string[] };
  const sauceLine = sauceMatch[1] ?? '';
  const userNote = trimmed.slice(0, sauceMatch.index).replace(/\s·\s$/, '').trim();
  const sauces = sauceLine
    .replace(/^صوصات:\s*/, '')
    .split('،')
    .map((s) => s.trim())
    .filter(Boolean);
  return { userNote, sauces };
}

export function formatItemSaucesLine(sauceNames: string[]) {
  const unique = [...new Set(sauceNames.map((n) => n.trim()).filter(Boolean))];
  if (!unique.length) return '';
  return `صوصات: ${unique.join('، ')}`;
}

export function kitchenItemNote(userNote: string, sauceNames: string[]) {
  const parts = [userNote.trim(), formatItemSaucesLine(sauceNames)].filter(Boolean);
  return parts.join('\n');
}

export function customerItemNote(userNote: string, sauceNames?: string[]) {
  if (sauceNames?.length) return userNote.trim();
  return parseItemNote(userNote).userNote;
}

export function itemNoteForApi(item: { note: string; sauces?: string[] }) {
  return formatItemNote(item.note, item.sauces ?? []);
}

export function formatReceiptItemName(
  name: string,
  userNote: string,
  sauceNames?: string[],
  options?: { includeSauces?: boolean },
) {
  const note = options?.includeSauces
    ? kitchenItemNote(userNote, sauceNames ?? [])
    : customerItemNote(userNote, sauceNames);
  const trimmed = note.trim();
  if (!trimmed) return name;
  return `${name} (${trimmed})`;
}
