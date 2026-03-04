/**
 * Creates a regex pattern for validating token amount input.
 * - Allows unlimited digits before the decimal point by default
 * - Allows up to decimals digits after the decimal point
 * - Allows empty string, trailing decimal, and leading decimal
 * - Optionally allows limiting digits before decimal
 */
export const createAmountInputRegex = (decimals: number, maxDigitsBeforeDecimal?: number): RegExp => {
  if (maxDigitsBeforeDecimal === undefined) {
    return new RegExp(`^(\\d+\\.?|\\d*\\.\\d{0,${decimals}})$|^$`)
  }

  return new RegExp(`^(\\d{1,${maxDigitsBeforeDecimal}}\\.?|\\d{0,${maxDigitsBeforeDecimal}}\\.\\d{0,${decimals}})$|^$`)
}

/**
 * Validates whether an input string is a valid token amount.
 * @param input - The input string to validate
 * @param decimals - The number of decimal places allowed for the token
 * @param maxDigitsBeforeDecimal - Optional max digits before decimal
 * @returns true if the input is valid, false otherwise
 */
export const isValidAmountInput = (input: string, decimals: number, maxDigitsBeforeDecimal?: number): boolean => {
  const regex = createAmountInputRegex(decimals, maxDigitsBeforeDecimal)
  return regex.test(input)
}
