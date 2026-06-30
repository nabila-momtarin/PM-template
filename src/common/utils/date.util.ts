// FILE: src/common/utils/date.util.ts
// নতুন ফাইল হলে এই নামেই বানাও, existing date util থাকলে এখানে function যোগ করো
// PURPOSE: officeHour হিসাব করতে date-range-এর মধ্যে working days (Sat/Sun বাদে) count করা

export function getWorkingDaysCount(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const day = cur.getDay(); // 5 = Friday, 6 = Saturday
    if (day !== 5 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

// usage: officeHour = getWorkingDaysCount(startDate, endDate) * 8
