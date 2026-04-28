export function calculateCurrentStreak(
  completions: string[],
  today?: string
): number {
  const todayDate =
    today ?? new Date().toISOString().slice(0, 10)

  const unique = [...new Set(completions)].sort()

  if (!unique.includes(todayDate)) return 0

  let streak = 0
  const current = new Date(todayDate + 'T12:00:00Z')

  while (true) {
    const dateStr = current.toISOString().slice(0, 10)
    if (!unique.includes(dateStr)) break
    streak++
    current.setUTCDate(current.getUTCDate() - 1)
  }

  return streak
}
