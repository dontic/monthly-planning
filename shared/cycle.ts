/** Planning cycles run September → August; returns the year in which the current one started. */
export const planningYearStart = (d = new Date()) => (d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1);
