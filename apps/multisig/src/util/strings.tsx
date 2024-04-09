export function capitalizeFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const parseURL = (url: string) => {
  try {
    return new URL(url)
  } catch (e) {
    return false
  }
}
