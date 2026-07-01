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
//  0=Sunday, 1=Monday, 2=Tuesday, 3=Wednessday, 4=Thursday, 5=Friday, 6=Saturday