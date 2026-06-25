const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

type ReleasableItem = {
  year?: string;
  releaseDate?: string;
};

export function releaseMonthYear(item: ReleasableItem) {
  const value = item.releaseDate;
  if (!value) return item.year || 'ไม่ระบุ';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return item.year || 'ไม่ระบุ';

  return `${thaiMonths[date.getMonth()]} ${date.getFullYear()}`;
}
