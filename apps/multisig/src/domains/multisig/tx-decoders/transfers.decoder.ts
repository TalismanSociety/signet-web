import { BaseToken, isSubstrateAssetsToken, isSubstrateTokensToken } from '@domains/chains'
import { TransactionRecipient, TransactionType, VestingSchedule } from '@domains/offchain-data/metadata/types'
import { Address, parseCallAddressArg } from '@util/addresses'
import BN from 'bn.js'
import { TxDecoder } from './tx-decoders.types'

interface SubstrateNativeTokenTransfer {
  section: 'balances'
  method: string
  args: {
    dest:
      | {
          Id: string
        }
      | string
    value: string
  }
}

interface SubstrateAssetsTokenTransfer {
  section: 'assets'
  method: string
  args: {
    id: string
    target:
      | {
          Id: string
        }
      | string
    amount: string
  }
}

interface SubstrateTokensTokenTransfer {
  section: 'tokens'
  method: string
  args: {
    currency_id: string
    dest:
      | {
          Id: string
        }
      | string
    amount: string
  }
}

const isSubstrateNativeTokenTransfer = (argHuman: any): argHuman is SubstrateNativeTokenTransfer => {
  try {
    const correctMethod = argHuman?.section === 'balances' && argHuman?.method?.startsWith('transfer')
    const validAddress = Address.fromSs58(parseCallAddressArg(argHuman?.args?.dest))
    return correctMethod && !!validAddress
  } catch (error) {
    return false
  }
}

const isSubstrateAssetsTokenTransfer = (argHuman: any): argHuman is SubstrateAssetsTokenTransfer => {
  try {
    const correctMethod = argHuman?.section === 'assets' && argHuman?.method?.startsWith('transfer')
    const validAddress = Address.fromSs58(parseCallAddressArg(argHuman?.args?.target))
    return correctMethod && !!validAddress
  } catch (error) {
    return false
  }
}

const isSubstrateTokensTokenTransfer = (argHuman: any): argHuman is SubstrateTokensTokenTransfer => {
  try {
    const correctMethod = argHuman?.section === 'tokens' && argHuman?.method?.startsWith('transfer')
    const validAddress = Address.fromSs58(argHuman?.args?.dest)
    return correctMethod && !!validAddress
  } catch (error) {
    return false
  }
}

/**
 * schedule could be in two formats:
 * - { startingBlock: string, perBlock: string, locked: string }
 * - { start: string, period_count: string, perPeriod: string, period: string }
 */
const callToVestingSchedule = (schedule: any): VestingSchedule | null => {
  if (schedule.startingBlock && schedule.perBlock && schedule.locked) {
    const totalAmount = new BN(schedule.locked.replaceAll(',', ''))
    const period = totalAmount.div(new BN(schedule.perBlock.replaceAll(',', ''))).toNumber()
    return {
      start: +schedule.startingBlock.replaceAll(',', ''),
      period,
      totalAmount,
    }
  }

  if (schedule.start && schedule.periodCount && schedule.perPeriod) {
    const period = +`${schedule.periodCount}`.replaceAll(',', '')
    return {
      start: +schedule.start.replaceAll(',', ''),
      period,
      totalAmount: new BN(schedule.perPeriod.replaceAll(',', '')).mul(new BN(period)),
    }
  }
  return null
}

const callToTransactionRecipient = (arg: any, chainTokens: BaseToken[]): TransactionRecipient | null => {
  if (arg?.section === 'vesting' && arg?.method === 'vestedTransfer') {
    const { target, dest, schedule } = arg.args
    const targetAddress = Address.fromSs58(parseCallAddressArg(target ?? dest))
    const vestingSchedule = callToVestingSchedule(schedule)
    if (vestingSchedule && targetAddress) {
      return {
        address: targetAddress,
        balance: {
          token: chainTokens.find(t => t.type === 'substrate-native')!,
          amount: vestingSchedule.totalAmount,
        },
        vestingSchedule,
      }
    }
  }
  if (isSubstrateNativeTokenTransfer(arg)) {
    const nativeToken = chainTokens.find(t => t.type === 'substrate-native')
    if (!nativeToken) throw Error(`Chain does not have a native token!`)
    const address = Address.fromSs58(parseCallAddressArg(arg.args.dest))
    if (address === false) throw Error('Chain returned invalid SS58 address for transfer destination')
    return {
      address,
      balance: {
        token: nativeToken,
        amount: new BN(arg.args.value.replaceAll(',', '')),
      },
    }
  } else if (isSubstrateAssetsTokenTransfer(arg)) {
    const token = chainTokens.find(t => isSubstrateAssetsToken(t) && t.assetId === arg.args.id.replaceAll(',', ''))
    if (!token) {
      console.error(`Chaindata squid does not have substrate asset with ID ${arg.args.id.replaceAll(',', '')}!`)
      return null
    }
    const address = Address.fromSs58(parseCallAddressArg(arg.args.target))
    if (address === false) throw Error('Chain returned invalid SS58 address for transfer destination')
    return {
      address,
      balance: {
        token,
        amount: new BN(arg.args.amount.replaceAll(',', '')),
      },
    }
  } else if (isSubstrateTokensTokenTransfer(arg)) {
    const token = chainTokens.find(
      t => isSubstrateTokensToken(t) && t.onChainId === parseInt(arg.args.currency_id.replaceAll(',', ''))
    )
    if (!token) {
      console.error(
        `Chaindata squid does not have substrate asset with ID ${arg.args.currency_id.replaceAll(',', '')}!`
      )
      return null
    }
    const address = Address.fromSs58(parseCallAddressArg(arg.args.dest))
    if (address === false) throw Error('Chain returned invalid SS58 address for transfer destination')
    return {
      address,
      balance: {
        token,
        amount: new BN(arg.args.amount.replaceAll(',', '')),
      },
    }
  }

  // Add other token types to support here.
  return null
}

// Check for Transfer
export const decodeTransfers: TxDecoder = ({ methodArg, tokens, metadata, multisig }) => {
  let recipients: TransactionRecipient[] = []

  // check for basic transfer
  const maybeRecipient = callToTransactionRecipient(methodArg, tokens)
  if (maybeRecipient) recipients.push(maybeRecipient)
  if (recipients.length === 1) {
    return {
      decoded: {
        type: TransactionType.Transfer,
        recipients,
      },
      description: metadata?.description ?? `Send to ${recipients[0]!.address.toShortSs58(multisig.chain)}`,
    }
  }

  // Check for MultiSend
  if (methodArg?.section === 'utility' && methodArg?.method?.startsWith('batch')) {
    const recipients: (TransactionRecipient | null)[] = methodArg.args.calls.map((call: any) =>
      callToTransactionRecipient(call, tokens)
    )
    if (!recipients.includes(null) && recipients.length >= 1) {
      return {
        decoded: {
          type: TransactionType.MultiSend,
          recipients: recipients as TransactionRecipient[],
        },
        description: metadata?.description ?? `Send to ${recipients.length} recipients`,
      }
    }
  }

  return null
}
