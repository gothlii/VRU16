export function saturdayDate(year, week) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !Number.isInteger(week)) throw new Error('Ange ett giltigt år och veckonummer.');
  const januaryFirst = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maximum = januaryFirst === 4 || (januaryFirst === 3 && leap) ? 53 : 52;
  if (week < 1 || week > maximum) throw new Error(`År ${year} har veckorna 1–${maximum}.`);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = 4 - ((januaryFourth.getUTCDay() || 7) - 1);
  return new Date(Date.UTC(year, 0, monday + (week - 1) * 7 + 5)).toISOString().slice(0, 10);
}
export function validateDate(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ange ett datum i formatet ÅÅÅÅ-MM-DD.');
  const date=new Date(value+'T00:00:00Z');
  if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value || Number(value.slice(0,4))<1900 || Number(value.slice(0,4))>2200) throw new Error('Ange ett giltigt datum.');
  return value;
}
export function normalizedName(name) { return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv'); }
export function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.children) || !Array.isArray(plan.trips)) throw new Error('Reseplanens format är ogiltigt.');
  const ids = new Set(), names = new Set(), tripIds = new Set();
  for (const child of plan.children) {
    if (typeof child.id !== 'string' || !child.id || typeof child.name !== 'string' || !normalizedName(child.name) || child.name.length > 100 || ids.has(child.id) || names.has(normalizedName(child.name))) throw new Error('Spelarlistan innehåller ett ogiltigt namn eller en dubblett.');
    ids.add(child.id); names.add(normalizedName(child.name));
  }
  for (const trip of plan.trips) {
    if (typeof trip.id !== 'string' || !trip.id || tripIds.has(trip.id) || !Number.isInteger(trip.week) || trip.week < 1 || trip.week > 53 || typeof trip.leaders !== 'string' || trip.leaders.length > 200 || typeof trip.note !== 'string' || trip.note.length > 300 || !Array.isArray(trip.assignments)) throw new Error('En resa har ogiltiga uppgifter.');
    saturdayDate(trip.year, trip.week);
    validateDate(trip.date);
    tripIds.add(trip.id); const assigned = new Set();
    for (const a of trip.assignments) {
      if (!ids.has(a.childId) || assigned.has(a.childId) || typeof a.goalkeeper !== 'boolean' || typeof a.uncertain !== 'boolean') throw new Error('Välj barn från spelarlistan. Samma barn får bara finnas en gång per resa.');
      assigned.add(a.childId);
    }
  }
  return plan;
}
export function tripCounts(plan) {
  const counts = new Map(plan.children.map(c => [c.id, 0]));
  for (const trip of plan.trips) for (const id of new Set(trip.assignments.map(a => a.childId))) counts.set(id, (counts.get(id) || 0) + 1);
  return counts;
}
export function filterTrips(plan, query) {
  const term = normalizedName(query); const names = new Map(plan.children.map(c => [c.id,c.name]));
  return plan.trips.filter(t => [`vecka ${t.week}`,`v${t.week}`,t.date,t.leaders,t.note,...t.assignments.map(a => names.get(a.childId))].join(' ').toLocaleLowerCase('sv').includes(term));
}
export function addChild(plan, name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > 100) throw new Error('Skriv ett namn med högst 100 tecken.');
  if (plan.children.some(c => normalizedName(c.name) === normalizedName(trimmed))) throw new Error('Barnet finns redan i spelarlistan. Välj det namnet i stället.');
  const child = {id:crypto.randomUUID(),name:trimmed}; plan.children.push(child); return child;
}

export function newWeekDefaults(plan) {
  const last=[...plan.trips].sort((a,b)=>a.year-b.year||a.week-b.week).at(-1);
  if(!last) return {year:2027,week:1};
  let year=last.year,week=last.week+1;
  try {saturdayDate(year,week);} catch {year++;week=1;}
  return {year,week};
}
