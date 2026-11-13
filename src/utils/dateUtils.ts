export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysDifference(fromISO: string, toISO: string): number {
  const f = new Date(fromISO + 'T00:00:00');
  const t = new Date(toISO + 'T00:00:00');
  return Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPastDatesISO(numDays: number): string[] {
  const today = getTodayISO();
  const result: string[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    result.push(addDaysISO(today, -i));
  }
  return result;
}

export function isDateInCurrentWeek(dateISO: string): boolean {
  const diff = getDaysDifference(dateISO, getTodayISO());
  return diff >= 0 && diff < 7;
}

export function isDateInCurrentMonth(dateISO: string): boolean {
  const today = getTodayISO();
  return dateISO.slice(0, 7) === today.slice(0, 7);
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
