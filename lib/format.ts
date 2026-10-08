export function fmtTime(d: Date | string | number) {
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function fmtDay(d: Date | string | number) {
  return new Date(d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export function fmtDateTime(d: Date | string | number) {
  return new Date(d).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(d: Date | string | number, now: number) {
  const mins = Math.round((now - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h ${mins % 60} min ago`
  return `${Math.floor(h / 24)} d ago`
}

export function fmtUnits(u: number) {
  return `${Number.isInteger(u) ? u : u.toFixed(1)} U`
}

export function dayKey(d: Date | string | number) {
  const x = new Date(d)
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
}
