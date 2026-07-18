export type DateValue = string | number | Date | null | undefined;

const pad = (value: number) => String(value).padStart(2, '0');

function partsFromValue(value: DateValue) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const text = value.trim();

    if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(text)) {
      const localDate = new Date(text);
      if (!Number.isNaN(localDate.getTime())) {
        return {
          year: String(localDate.getFullYear()),
          month: pad(localDate.getMonth() + 1),
          day: pad(localDate.getDate()),
          hour: pad(localDate.getHours()),
          minute: pad(localDate.getMinutes()),
          second: pad(localDate.getSeconds()),
        };
      }
    }

    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (iso) {
      return {
        year: iso[1],
        month: iso[2],
        day: iso[3],
        hour: iso[4],
        minute: iso[5],
        second: iso[6],
      };
    }

    const dayFirst = text.match(/^(\d{2})-(\d{2})-(\d{4})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (dayFirst) {
      return {
        year: dayFirst[3],
        month: dayFirst[2],
        day: dayFirst[1],
        hour: dayFirst[4],
        minute: dayFirst[5],
        second: dayFirst[6],
      };
    }

    const monthFirst = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (monthFirst) {
      return {
        year: monthFirst[3],
        month: pad(Number(monthFirst[1])),
        day: pad(Number(monthFirst[2])),
        hour: monthFirst[4] ? pad(Number(monthFirst[4])) : undefined,
        minute: monthFirst[5],
        second: monthFirst[6],
      };
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: String(date.getFullYear()),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
    second: pad(date.getSeconds()),
  };
}

export function formatDate(value: DateValue, fallback = '—') {
  const parts = partsFromValue(value);
  return parts ? `${parts.month}/${parts.day}/${parts.year}` : fallback;
}

export function formatDateTime(value: DateValue, fallback = '—') {
  const parts = partsFromValue(value);
  if (!parts) return fallback;
  const date = `${parts.month}/${parts.day}/${parts.year}`;
  if (parts.hour == null || parts.minute == null) return date;
  return `${date} ${parts.hour}:${parts.minute}:${parts.second || '00'}`;
}
