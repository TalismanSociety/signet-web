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

export const removeSurroundingCharacters = (input: string): string => {
  // Regular expression to remove the first and last characters if they are not letters or numbers
  // Sample input: '“Santos”'
  // Sample output: 'Santos'
  return input.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
}
