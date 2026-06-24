export const DEPOSIT_CUTOFF_DAYS = 2;
export const NEXT_DAY_BOOKING_CUTOFF_HOUR = 22;

export function dateAllowsDeposit(eventDate: string, currentDate: string) {
  if (!eventDate || !currentDate) return false;

  const start = new Date(`${currentDate}T00:00:00Z`);
  const event = new Date(`${eventDate}T00:00:00Z`);
  const daysUntilEvent = Math.round((event.getTime() - start.getTime()) / 86_400_000);

  return daysUntilEvent > DEPOSIT_CUTOFF_DAYS;
}

export function getDubaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getDubaiHour() {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());

  return Number(hour);
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

export function getMinimumBookableDate() {
  const dubaiDate = getDubaiDate();
  const dubaiHour = getDubaiHour();

  return addDaysToDateKey(dubaiDate, dubaiHour >= NEXT_DAY_BOOKING_CUTOFF_HOUR ? 2 : 1);
}
