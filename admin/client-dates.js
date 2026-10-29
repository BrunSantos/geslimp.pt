export function todayPortugal(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {timeZone:'Europe/Lisbon', year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value = type => parts.find(p=>p.type===type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
}
export function addCalendarMonths(value, months) {
  if (!validDate(value)) return null;
  const [y,m,d] = value.split('-').map(Number);
  const first = new Date(Date.UTC(y,m-1+months,1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,lastDay)).padStart(2,'0')}`;
}
export function isPremium(clientSince, now = new Date()) {
  const threshold = addCalendarMonths(clientSince,5);
  return Boolean(threshold && todayPortugal(now)>=threshold);
}
