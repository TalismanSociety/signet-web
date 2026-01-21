import { isValidAmountInput, createAmountInputRegex } from './amountValidation'

describe('isValidAmountInput', () => {
  describe('with 18 decimals (DOT-like)', () => {
    const decimals = 18

    it('allows empty string', () => {
      expect(isValidAmountInput('', decimals)).toBe(true)
    })

    it('allows integers', () => {
      expect(isValidAmountInput('0', decimals)).toBe(true)
      expect(isValidAmountInput('1', decimals)).toBe(true)
      expect(isValidAmountInput('123', decimals)).toBe(true)
      expect(isValidAmountInput('1000000', decimals)).toBe(true)
    })

    it('allows large integers up to max supply (15 digits)', () => {
      expect(isValidAmountInput('100000000000000', decimals)).toBe(true) // 100 trillion (15 digits)
      expect(isValidAmountInput('999999999999999', decimals)).toBe(true) // max 15 digits
    })

    it('rejects integers exceeding 15 digits', () => {
      expect(isValidAmountInput('1000000000000000', decimals)).toBe(false) // 16 digits
      expect(isValidAmountInput('12345678901234567890', decimals)).toBe(false) // 20 digits
    })

    it('allows decimals with valid precision', () => {
      expect(isValidAmountInput('1.5', decimals)).toBe(true)
      expect(isValidAmountInput('123.456', decimals)).toBe(true)
      expect(isValidAmountInput('0.123456789012345678', decimals)).toBe(true) // exactly 18 decimals
    })

    it('allows trailing decimal (user is typing)', () => {
      expect(isValidAmountInput('123.', decimals)).toBe(true)
      expect(isValidAmountInput('0.', decimals)).toBe(true)
    })

    it('allows leading decimal', () => {
      expect(isValidAmountInput('.5', decimals)).toBe(true)
      expect(isValidAmountInput('.123456789012345678', decimals)).toBe(true)
    })

    it('rejects decimals exceeding token precision', () => {
      expect(isValidAmountInput('1.1234567890123456789', decimals)).toBe(false) // 19 decimals
      expect(isValidAmountInput('0.12345678901234567890', decimals)).toBe(false) // 20 decimals
    })

    it('allows large numbers with decimals', () => {
      expect(isValidAmountInput('999999999999999.123456789012345678', decimals)).toBe(true)
    })

    it('rejects invalid formats', () => {
      expect(isValidAmountInput('abc', decimals)).toBe(false)
      expect(isValidAmountInput('12.34.56', decimals)).toBe(false)
      expect(isValidAmountInput('-1', decimals)).toBe(false)
      expect(isValidAmountInput('1e10', decimals)).toBe(false)
      expect(isValidAmountInput(' 123', decimals)).toBe(false)
      expect(isValidAmountInput('123 ', decimals)).toBe(false)
    })
  })

  describe('with 10 decimals (DOT native)', () => {
    const decimals = 10

    it('allows up to 10 decimal places', () => {
      expect(isValidAmountInput('1.1234567890', decimals)).toBe(true)
    })

    it('rejects more than 10 decimal places', () => {
      expect(isValidAmountInput('1.12345678901', decimals)).toBe(false)
    })

    it('allows large amounts like DOT max supply', () => {
      // DOT max supply is ~1.5 billion = 1500000000 (10 digits)
      expect(isValidAmountInput('1500000000', decimals)).toBe(true)
      expect(isValidAmountInput('1500000000.1234567890', decimals)).toBe(true)
    })
  })

  describe('with 6 decimals (USDC-like)', () => {
    const decimals = 6

    it('allows up to 6 decimal places', () => {
      expect(isValidAmountInput('100.123456', decimals)).toBe(true)
    })

    it('rejects more than 6 decimal places', () => {
      expect(isValidAmountInput('100.1234567', decimals)).toBe(false)
    })
  })

  describe('with 0 decimals (integer-only token)', () => {
    const decimals = 0

    it('allows integers', () => {
      expect(isValidAmountInput('123', decimals)).toBe(true)
    })

    it('allows trailing decimal', () => {
      expect(isValidAmountInput('123.', decimals)).toBe(true)
    })

    it('allows just decimal point', () => {
      expect(isValidAmountInput('.', decimals)).toBe(true)
    })

    it('rejects any decimal places', () => {
      expect(isValidAmountInput('123.1', decimals)).toBe(false)
      expect(isValidAmountInput('.1', decimals)).toBe(false)
    })
  })

  describe('with custom maxDigitsBeforeDecimal', () => {
    it('respects custom max digits before decimal', () => {
      expect(isValidAmountInput('12345', 18, 5)).toBe(true)
      expect(isValidAmountInput('123456', 18, 5)).toBe(false)
    })
  })
})

describe('createAmountInputRegex', () => {
  it('creates a valid regex', () => {
    const regex = createAmountInputRegex(18)
    expect(regex).toBeInstanceOf(RegExp)
  })

  it('creates regex with correct pattern for different decimals', () => {
    const regex6 = createAmountInputRegex(6)
    const regex18 = createAmountInputRegex(18)

    expect(regex6.test('1.123456')).toBe(true)
    expect(regex6.test('1.1234567')).toBe(false)

    expect(regex18.test('1.123456789012345678')).toBe(true)
    expect(regex18.test('1.1234567890123456789')).toBe(false)
  })
})
