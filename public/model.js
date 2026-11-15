export function normalizedName(name) { return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv'); }
export function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.children) || !Array.isArray(plan.trips)) throw new Error('Reseplanens format är ogiltigt.');
  const ids = new Set(), names = new Set(), tripIds = new Set();
  for (const child of plan.children) {
    if (typeof child.id !== 'string' || !child.id || typeof child.name !== 'string' || !normalizedName(child.name) || child.name.length > 100 || ids.has(child.id) || names.has(normalizedName(child.name))) throw new Error('Spelarlistan innehåller ett ogiltigt namn eller en dubblett.');
    ids.add(child.id); names.add(normalizedName(child.name));
  }
  for (const trip of plan.trips) {
    if (typeof trip.id !== 'string' || !trip.id || tripIds.has(trip.id) || !Number.isInteger(trip.week) || trip.week < 1 || trip.week > 53 || typeof trip.leaders !== 'string' || !trip.leaders.trim() || trip.leaders.length > 200 || typeof trip.note !== 'string' || trip.note.length > 300 || !Array.isArray(trip.assignments)) throw new Error('En resa har ogiltiga uppgifter.');
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
  return plan.trips.filter(t => [`vecka ${t.week}`,`v${t.week}`,t.leaders,t.note,...t.assignments.map(a => names.get(a.childId))].join(' ').toLocaleLowerCase('sv').includes(term));
}
export function addChild(plan, name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > 100) throw new Error('Skriv ett namn med högst 100 tecken.');
  if (plan.children.some(c => normalizedName(c.name) === normalizedName(trimmed))) throw new Error('Barnet finns redan i spelarlistan. Välj det namnet i stället.');
  const child = {id:crypto.randomUUID(),name:trimmed}; plan.children.push(child); return child;
}
