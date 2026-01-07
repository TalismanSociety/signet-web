/**
 * Creates a regex pattern for validating token amount input.
 * - Allows up to maxDigitsBeforeDecimal digits before the decimal point
 * - Allows up to decimals digits after the decimal point
 * - Allows empty string, trailing decimal, and leading decimal
 */
export const createAmountInputRegex = (decimals: number, maxDigitsBeforeDecimal: number = 15): RegExp => {
  return new RegExp(`^(\\d{1,${maxDigitsBeforeDecimal}}\\.?|\\d{0,${maxDigitsBeforeDecimal}}\\.\\d{0,${decimals}})$|^$`)
}

/**
 * Validates whether an input string is a valid token amount.
 * @param input - The input string to validate
 * @param decimals - The number of decimal places allowed for the token
 * @param maxDigitsBeforeDecimal - Max digits before decimal (default 15, enough for any token supply)
 * @returns true if the input is valid, false otherwise
 */
export const isValidAmountInput = (input: string, decimals: number, maxDigitsBeforeDecimal: number = 15): boolean => {
  const regex = createAmountInputRegex(decimals, maxDigitsBeforeDecimal)
  return regex.test(input)
}
