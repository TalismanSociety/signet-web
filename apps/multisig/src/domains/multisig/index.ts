import {
  BaseToken,
  Chain,
  chainTokensByIdQuery,
  filteredSupportedChains,
  isSubstrateAssetsToken,
  isSubstrateTokensToken,
  supportedChains,
} from '@domains/chains'
import { TransactionType } from '@domains/offchain-data/metadata/types'
import { rawPendingTransactionsSelector } from '@domains/chains/storage-getters'
import { InjectedAccount, accountsState } from '@domains/extension'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Address, parseCallAddressArg, toMultisigAddress } from '@util/addresses'
import BN from 'bn.js'
import queryString from 'query-string'
import { atom, selector, useRecoilRefresher_UNSTABLE, useRecoilState, useRecoilValue } from 'recoil'
import persistAtom from '../persist'
import { VoteDetails, mapConvictionToIndex } from '../referenda'
import { selectedAccountState } from '../auth'
import { TxMetadata } from '@domains/offchain-data/metadata/types'
import { Multisig } from './types'
import { activeTeamsState } from '@domains/offchain-data'
import { Abi } from '@polkadot/api-contract'
import { DUMMY_MULTISIG_ID } from '@util/constants'
import {
  Balance,
  VestingSchedule,
  TransactionRecipient,
  TransactionDecoded,
  TransactionApprovals,
  Transaction,
} from '@domains/offchain-data/metadata/types'

export * from './types.d'
export * from './useSelectedMultisig'

// create a new atom for deciding whether to show all balances and txns or just for the selected
// multisig
export const combinedViewState = atom<boolean>({
  key: 'CombinedViewState',
  default: false,
  // effects_UNSTABLE: [persistAtom],
})

const DUMMY_MULTISIG: Multisig = {
  id: DUMMY_MULTISIG_ID,
  orgId: 'DUMMY_ORG',
  name: 'DUMMY_MULTISIG',
  description: 'DUMMY_MULTISIG_DESCRIPTION',
  chain: filteredSupportedChains[0] as Chain,
  signers: [],
  threshold: 0,
  multisigAddress: new Address(new Uint8Array(32)),
  proxyAddress: new Address(new Uint8Array(32)),
  collaborators: [],
}

export const selectedMultisigIdState = atom<string | undefined>({
  key: 'SelectedMultisigId',
  default: undefined,
  effects_UNSTABLE: [persistAtom],
})

export const activeMultisigsState = selector({
  key: 'ActiveMultisigs',
  get: ({ get }) => {
    const activeTeams = get(activeTeamsState)
    if (!activeTeams || activeTeams.length === 0) return []
    return activeTeams.map(team => team.asMultisig)
  },
})

export const selectedMultisigState = selector({
  key: 'SelectedMultisig',
  get: ({ get }) => {
    const multisigs = get(activeMultisigsState)
    const selectedMultisigId = get(selectedMultisigIdState)
    return multisigs.find(multisig => multisig.id === selectedMultisigId) ?? multisigs[0] ?? DUMMY_MULTISIG
  },
})

export const aggregatedMultisigsState = selector({
  key: 'aggregatedMultisigs',
  get: ({ get }) => {
    const combinedView = get(combinedViewState)
    const selectedMultisig = get(selectedMultisigState)
    const activeMultisigs = get(activeMultisigsState)
    return combinedView ? activeMultisigs ?? [] : [selectedMultisig]
  },
})

export const selectedMultisigChainTokensState = selector<BaseToken[]>({
  key: 'SelectedMultisigChainTokens',
  get: ({ get }) => {
    const multisig = get(selectedMultisigState)
    const tokens = get(chainTokensByIdQuery(multisig.chain.id))
    return tokens
  },
})

// Returns the next connected signer that needs to sign the transaction,
// or undefined if there are none that can sign
export const useNextTransactionSigner = (approvals: TransactionApprovals | undefined, threshold: number) => {
  const [extensionAccounts] = useRecoilState(accountsState)
  const selectedAccount = useRecoilValue(selectedAccountState)

  if (!approvals) return
  // ready to execute, let selected account sign
  if (Object.values(approvals).filter(approved => approved).length >= threshold) return selectedAccount?.injected

  if (selectedAccount?.injected && approvals[selectedAccount.injected.address.toPubKey()] === false) {
    return selectedAccount.injected
  }

  return extensionAccounts.find(account => approvals[account.address.toPubKey()] === false)
}

export interface ChangeConfigDetails {
  newThreshold: number
  newMembers: Address[]
}

export interface ContractDetails {
  name: string
  abi: Abi
}

export interface AugmentedAccount {
  address: Address
  you?: boolean
  nickname?: string
  excluded?: boolean
  injected?: InjectedAccount
}

export const toConfirmedTxUrl = (t: Transaction) =>
  `${t.multisig.chain.subscanUrl}extrinsic/${t.executedAt?.block}-${t.executedAt?.index}`

export const calcSumOutgoing = (t: Transaction): Balance[] => {
  if (!t.decoded) return []

  return t.decoded.recipients.reduce((acc: Balance[], r) => {
    const tokenId = r.balance.token.id
    const existingIndex = acc.findIndex(a => a.token.id === tokenId)
    if (existingIndex !== -1) {
      const existing = acc[existingIndex] as Balance
      const updatedBalance = {
        ...existing,
        amount: existing.amount.add(r.balance.amount),
      }
      acc[existingIndex] = updatedBalance
    } else {
      acc.push({ ...r.balance })
    }
    return acc
  }, [])
}

export const calcVoteSum = (t: Transaction): Balance | null => {
  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { convictionVote, details, token } = t.decoded.voteDetails
  const { Standard, SplitAbstain } = details

  let amount: BN

  // TODO: Add support to Split votes
  switch (convictionVote) {
    case 'SplitAbstain':
      amount = Object.values(SplitAbstain!).reduce((acc, balance) => acc.add(balance), new BN(0))
      break
    case 'Standard':
      amount = Standard?.balance!
      break
    default:
      // Handle removeVote
      amount = new BN(0)
      break
  }

  return { amount, token }
}

interface ChangeConfigCall {
  section: 'utility'
  method: 'batchAll'
  args: {
    calls: [
      {
        method: 'addProxy'
        args: {
          proxy_type: 'Any'
          delegate:
            | {
                Id: string
              }
            | string
        }
      },
      {
        method: 'removeProxy'
        args: {
          proxy_type: 'Any'
        }
      }
    ]
  }
}

const isChangeConfigCall = (arg: any): arg is ChangeConfigCall => {
  return (
    arg?.section === 'utility' &&
    arg?.method === 'batchAll' &&
    arg?.args?.calls.length === 2 &&
    arg?.args?.calls[0]?.method === 'addProxy' &&
    arg?.args?.calls[1]?.method === 'removeProxy' &&
    arg.args?.calls[0]?.args?.proxy_type === 'Any' &&
    arg.args?.calls[1]?.args?.proxy_type === 'Any' &&
    (typeof arg.args?.calls[0]?.args?.delegate === 'string' || arg.args?.calls[0]?.args?.delegate?.Id)
  )
}

interface ProxyCall {
  section: 'proxy'
  method: 'proxy'
  args: any
}

const isProxyCall = (arg: any): arg is ProxyCall => {
  return arg?.section === 'proxy' && arg?.method === 'proxy'
}

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

export const extrinsicToDecoded = (
  multisig: Multisig,
  extrinsic: SubmittableExtrinsic<'promise'>,
  chainTokens: BaseToken[],
  metadata?: Partial<TxMetadata> | null,
  defaultName?: string
): { decoded: TransactionDecoded; description: string } | 'not_ours' => {
  try {
    // If it's not a proxy call, just return advanced
    if (!isProxyCall(extrinsic.method)) {
      return {
        decoded: {
          type: TransactionType.Advanced,
          recipients: [],
        },
        description: defaultName ?? `${extrinsic.method.section}.${extrinsic.method.method}`,
      }
    }

    const { args } = extrinsic.method

    // Got proxy call. Check that it's for our proxy.
    // @ts-ignore
    const proxyString = parseCallAddressArg(extrinsic?.method?.toHuman()?.args?.real)
    const proxyAddress = Address.fromSs58(proxyString)
    if (!proxyAddress) throw Error('Chain returned invalid SS58 address for proxy')
    if (!proxyAddress.isEqual(multisig.proxyAddress)) return 'not_ours'

    // Check for Transfer
    let recipients: TransactionRecipient[] = []
    for (const arg of args) {
      const argHuman: any = arg.toHuman()
      const maybeRecipient = callToTransactionRecipient(argHuman, chainTokens)
      if (maybeRecipient) recipients.push(maybeRecipient)
    }
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
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'utility' && obj?.method?.startsWith('batch')) {
        const recipients: (TransactionRecipient | null)[] = obj.args.calls.map((call: any) =>
          callToTransactionRecipient(call, chainTokens)
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
    }

    // Check if it's a ChangeConfig type
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (metadata?.changeConfigDetails && isChangeConfigCall(obj)) {
        const { changeConfigDetails } = metadata
        // Validate that the metadata 'new configuration' info matches the
        // actual multisig that is being set on chain.
        const derivedNewMultisigAddress = toMultisigAddress(
          changeConfigDetails.newMembers,
          changeConfigDetails.newThreshold
        )
        const actualNewMultisigAddress = Address.fromSs58(parseCallAddressArg(obj.args.calls[0].args.delegate))
        if (actualNewMultisigAddress === false) throw Error('got an invalid ss52Address back from the chain!')
        if (!derivedNewMultisigAddress.isEqual(actualNewMultisigAddress)) {
          throw Error("Derived multisig address doesn't match actual multisig address")
        }

        return {
          decoded: {
            type: TransactionType.ChangeConfig,
            recipients: [],
            changeConfigDetails: {
              signers: changeConfigDetails.newMembers,
              threshold: changeConfigDetails.newThreshold,
            },
          },
          description: metadata?.description ?? 'Change multisig config',
        }
      }
    }

    // Check if it's a Vote type
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'convictionVoting') {
        const { poll_index, vote, index } = obj.args
        let voteDetails: VoteDetails | undefined

        if (obj?.method === 'removeVote') {
          voteDetails = {
            referendumId: index,
            method: obj.method,
            details: {},
          }
        }

        if (vote?.Standard) {
          voteDetails = {
            referendumId: poll_index,
            method: obj.method,
            convictionVote: 'Standard',
            details: {
              Standard: {
                balance: new BN(vote.Standard.balance.replaceAll(',', '')),
                vote: {
                  aye: vote.Standard.vote.vote === 'Aye',
                  conviction: mapConvictionToIndex(vote.Standard.vote.conviction),
                },
              },
            },
          }
        }

        if (vote?.SplitAbstain) {
          voteDetails = {
            referendumId: poll_index,
            method: obj.method,
            convictionVote: 'SplitAbstain',
            details: {
              SplitAbstain: {
                aye: new BN(vote.SplitAbstain.aye.replaceAll(',', '')),
                nay: new BN(vote.SplitAbstain.nay.replaceAll(',', '')),
                abstain: new BN(vote.SplitAbstain.abstain.replaceAll(',', '')),
              },
            },
          }
        }

        if (voteDetails) {
          const token = chainTokens.find(t => t.type === 'substrate-native')
          if (!token) throw Error(`Chain does not have a native token!`)
          return {
            decoded: {
              type: TransactionType.Vote,
              recipients: [],
              voteDetails: {
                ...voteDetails,
                token,
              },
            },
            description: metadata?.description ?? `Vote on referendum #${poll_index}`,
          }
        }
      }
    }

    // Check if it's a NominateFromNomPool type
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'nominationPools' && obj?.method === 'nominate') {
        const { pool_id, validators } = obj.args
        return {
          decoded: {
            type: TransactionType.NominateFromNomPool,
            recipients: [],
            nominate: {
              poolId: +pool_id,
              validators,
            },
          },
          description: metadata?.description ?? `Nominations for Pool #${pool_id}`,
        }
      }
    }

    // Check if it's a Smart Contract call
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'contracts' && obj?.method === 'call') {
        const { dest, data } = obj.args
        const address = Address.fromSs58(parseCallAddressArg(dest))
        if (!address) throw new Error('Contract call destination is not a valid address')
        return {
          decoded: {
            type: TransactionType.ContractCall,
            recipients: [],
            contractCall: {
              address,
              data,
            },
          },
          description: metadata?.description ?? `Contract call to ${address.toShortSs58(multisig.chain)}`,
        }
      }
    }

    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'contracts' && obj?.method === 'instantiateWithCode') {
        const { code, data, salt, value } = obj.args
        const valueBN = new BN(value.replaceAll(',', ''))
        return {
          decoded: {
            type: TransactionType.DeployContract,
            recipients: [],
            contractDeployment: metadata?.contractDeployed
              ? {
                  abi: metadata.contractDeployed.abi,
                  code,
                  data,
                  salt,
                  name: metadata.contractDeployed.name,
                  value: valueBN,
                }
              : undefined,
          },
          description: metadata?.description ?? `Deploy contract ${metadata?.contractDeployed?.name}`,
        }
      }
    }

    // check for add / remove proxy
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'proxy') {
        if (obj.method === 'addProxy' || obj.method === 'removeProxy') {
          const { delegate, proxy_type } = obj.args
          const address = Address.fromSs58(parseCallAddressArg(delegate))
          if (!address) throw new Error('Add proxy destination is not a valid address')
          const action = obj.method === 'addProxy' ? 'Add' : 'Remove'
          return {
            decoded: {
              type: TransactionType.Advanced,
              recipients: [],
            },
            description:
              metadata?.description ?? `${action} ${address.toShortSs58(multisig.chain)} as ${proxy_type} proxy`,
          }
        }
      }
    }

    // check for vested transfer
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'vesting') {
        if (obj.method === 'vestedTransfer') {
          const { target, dest, schedule } = obj.args
          const targetAddress = Address.fromSs58(parseCallAddressArg(target ?? dest))
          const vestingSchedule = callToVestingSchedule(schedule)
          if (targetAddress && vestingSchedule) {
            return {
              decoded: {
                type: TransactionType.Transfer,
                recipients: [
                  {
                    address: targetAddress,
                    balance: {
                      token: chainTokens.find(t => t.type === 'substrate-native')!,
                      amount: vestingSchedule.totalAmount,
                    },
                    vestingSchedule,
                  },
                ],
              },
              description: metadata?.description ?? `Vested transfer to ${targetAddress.toShortSs58(multisig.chain)}`,
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error decoding extrinsic ${JSON.stringify(extrinsic.method.toHuman(), null, 2)}: `, error)
  }
  return {
    decoded: {
      type: TransactionType.Advanced,
      recipients: [],
    },
    description: metadata?.description ?? defaultName ?? `${extrinsic.method.section}.${extrinsic.method.method}`,
  }
}

export const pendingTransactionsState = atom<Transaction[]>({
  key: 'PendingTransactions',
  default: [],
  dangerouslyAllowMutability: true, // fixes an issue with pjs mutating itself
})

export const pendingTransactionsLoadingState = atom<boolean>({
  key: 'PendingTransactionsLoading',
  default: true,
})

export const executingTransactionsState = atom<Transaction[]>({
  key: 'ExecutingTransaction',
  default: [],
  dangerouslyAllowMutability: true, // fixes an issue with pjs mutating itself
})

export const tempCalldataState = atom<Record<string, `0x${string}`>>({
  key: 'TempCalldata',
  default: {},
})

export const useRefreshMultisigPendingTransactions = (teamId?: string) => {
  return useRecoilRefresher_UNSTABLE(rawPendingTransactionsSelector(teamId ?? ''))
}

export const EMPTY_BALANCE: Balance = {
  token: {
    id: 'polkadot',
    coingeckoId: 'polkadot',
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/polkadot.svg',
    type: 'substrate-native',
    symbol: 'DOT',
    decimals: 10,
    chain: supportedChains.find(c => c.id === 'polkadot') as Chain,
  },
  amount: new BN(0),
}

export const createImportPath = (name: string, signers: Address[], threshold: number, proxy: Address, chain: Chain) => {
  const params = {
    name,
    signers: signers.map(a => a.toSs58(chain)).join(','),
    threshold,
    proxy: proxy.toSs58(chain),
    chain_id: chain.id,
  }
  return `import?${queryString.stringify(params)}`
}
