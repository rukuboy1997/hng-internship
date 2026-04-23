export function generateId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const randomLetters = () =>
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)]
  const randomNumbers = () =>
    String(Math.floor(Math.random() * 9000) + 1000)
  return randomLetters() + randomNumbers()
}

export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function addDays(dateString, days) {
  const date = new Date(dateString)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
