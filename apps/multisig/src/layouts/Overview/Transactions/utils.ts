export const formattedHhMm = (d: Date) =>
  d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

export const formattedDate = (d: Date) => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  let date = d.toLocaleDateString()
  if (d.toLocaleDateString() === today.toLocaleDateString()) {
    date = 'Today'
  } else if (d.toLocaleDateString() === yesterday.toLocaleDateString()) {
    date = 'Yesterday'
  }

  return `${date}, ${formattedHhMm(d)}`
}
