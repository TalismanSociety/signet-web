import {
  BaseToken,
  Chain,
  allChainTokensSelector,
  chainTokensByIdQuery,
  decodeCallData,
  filteredSupportedChains,
  isSubstrateAssetsToken,
  isSubstrateTokensToken,
  supportedChains,
} from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import {
  RawPendingTransaction,
  allRawPendingTransactionsSelector,
  blockSelector,
  rawPendingTransactionsSelector,
} from '@domains/chains/storage-getters'
import { InjectedAccount, accountsState } from '@domains/extension'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Address, parseCallAddressArg, toMultisigAddress } from '@util/addresses'
import { makeTransactionID } from '@util/misc'
import BN from 'bn.js'
import queryString from 'query-string'
import { useEffect, useMemo, useState } from 'react'
import {
  atom,
  selector,
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
} from 'recoil'
import persistAtom from '../persist'
import { VoteDetails, mapConvictionToIndex } from '../referenda'
import { selectedAccountState } from '../auth'
import { TxMetadata, txMetadataByTeamIdState } from '../offchain-data/metadata'
import { Multisig } from './types'
import { activeTeamsState } from '@domains/offchain-data'
import { Abi } from '@polkadot/api-contract'
import { FrameSystemEventRecord } from '@polkadot/types/lookup'
import { ExtrinsicErrorsFromEvents } from '@util/errors'

export * from './types.d'
export * from './useSelectedMultisig'

export const DUMMY_MULTISIG_ID = 'DUMMY_MULTISIG'
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
    const tokens = get(chainTokensByIdQuery(multisig.chain.squidIds.chainData))
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

export enum TransactionType {
  MultiSend,
  Transfer,
  ChangeConfig,
  Advanced,
  Vote,
  NominateFromNomPool,
  NominateFromStaking,
  ContractCall,
  DeployContract,
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

export interface Balance {
  token: BaseToken
  amount: BN
}

export type VestingSchedule = {
  start: number
  period: number
  totalAmount: BN
}
export interface TransactionRecipient {
  address: Address
  balance: Balance
  vestingSchedule?: VestingSchedule
}

export interface TransactionApprovals {
  [key: string]: boolean
}

export interface ExecutedAt {
  block: number
  index: number
  by: Address
  events?: FrameSystemEventRecord[]
  errors?: ExtrinsicErrorsFromEvents
}

export interface TransactionDecoded {
  type: TransactionType
  recipients: TransactionRecipient[]
  changeConfigDetails?: {
    signers: Address[]
    threshold: number
  }
  nominate?: {
    poolId?: number
    validators: string[]
  }
  contractCall?: {
    address: Address
    data: `0x${string}`
  }
  contractDeployment?: {
    abi: Abi
    name: string
    code: `0x${string}`
    data: `0x${string}`
    salt: `0x${string}`
    value: BN
  }
  voteDetails?: VoteDetails & { token: BaseToken }
}

export interface Transaction {
  description: string
  hash: `0x${string}`
  multisig: Multisig
  approvals: TransactionApprovals
  executedAt?: ExecutedAt
  date: Date
  rawPending?: RawPendingTransaction
  decoded?: TransactionDecoded
  callData?: `0x${string}`
  id?: string
  metadataSaved?: boolean
  draft?: {
    createdAt: Date
    creator: {
      id: string
      address: Address
    }
    id: string
  }
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
      if (obj?.section === 'convictionVoting' && obj?.method === 'vote') {
        const { poll_index, vote } = obj.args
        let voteDetails: VoteDetails | undefined

        if (vote.Standard) {
          voteDetails = {
            referendumId: poll_index,
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

    // check for vested transfer/ remove proxy
    for (const arg of args) {
      const obj: any = arg.toHuman()
      if (obj?.section === 'vesting') {
        if (obj.method === 'vestedTransfer' || obj.method === 'removeProxy') {
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

const pendingTransactionsSelector = selector<Transaction[]>({
  key: 'pendingTransactionsSelector',
  dangerouslyAllowMutability: true,
  get: ({ get }) => {
    const allRawPendingTransactions = get(allRawPendingTransactionsSelector)
    const txMetadataByTeamId = get(txMetadataByTeamIdState)
    const tempCalldata = get(tempCalldataState)

    const transactions: Transaction[] = []
    for (const rawPending of allRawPendingTransactions) {
      const timepoint_height = rawPending.onChainMultisig.when.height.toNumber()
      const timepoint_index = rawPending.onChainMultisig.when.index.toNumber()
      const transactionID = makeTransactionID(rawPending.multisig.chain, timepoint_height, timepoint_index)

      const metadata = txMetadataByTeamId[rawPending.multisig.id]?.data[transactionID]
      let calldata = metadata?.callData ?? tempCalldata[transactionID]

      if (!calldata) {
        const block = get(blockSelector(`${rawPending.blockHash.toHex()}-${rawPending.multisig.chain.genesisHash}`))
        if (block) {
          const ext = block.block.extrinsics[timepoint_index]
          if (ext) {
            const innerExt = ext.method.args[3]! // proxy ext is 3rd arg
            calldata = innerExt.toHex()
          }
        }
      }

      if (calldata) {
        try {
          // Validate calldata from the metadata service matches the hash from the chain
          const pjsApi = get(pjsApiSelector(rawPending.multisig.chain.genesisHash))
          if (!pjsApi) throw Error(`pjsApi found for rpc ${rawPending.multisig.chain.squidIds.chainData}!`)

          // create extrinsic from callData
          const extrinsic = decodeCallData(pjsApi, calldata)
          if (!extrinsic) {
            throw new Error(
              `Failed to create extrinsic from callData recieved from metadata sharing service for transactionID ${transactionID}`
            )
          }

          // validate hash of extrinsic matches hash from chain
          const derivedHash = extrinsic.registry.hash(extrinsic.method.toU8a()).toHex()
          if (derivedHash !== rawPending.callHash) {
            throw new Error(
              `CallData from metadata sharing service for transactionID ${transactionID} does not match hash from chain. Expected ${rawPending.callHash}, got ${derivedHash}`
            )
          }

          const allActiveChainTokens = get(allChainTokensSelector)
          // get chain tokens
          const chainTokens = allActiveChainTokens.get(rawPending.multisig.chain.squidIds.chainData)
          if (!chainTokens) throw Error('Failed to load chainTokens for chain!')

          const decoded = extrinsicToDecoded(
            rawPending.multisig,
            extrinsic,
            chainTokens,
            metadata ?? { callData: calldata }
          )
          if (decoded === 'not_ours') continue

          transactions.push({
            date: rawPending.date,
            callData: calldata as `0x${string}`,
            hash: rawPending.callHash,
            rawPending: rawPending,
            multisig: rawPending.multisig,
            approvals: rawPending.approvals,
            id: transactionID,
            metadataSaved: true,
            ...decoded,
          })
          continue
        } catch (error) {
          console.error(`Invalid metadata for for transactionID ${transactionID}:`, error)
        }

        // no calldata. return unknown transaction
        transactions.push({
          date: rawPending.date,
          description: `Transaction ${transactionID}`,
          hash: rawPending.callHash,
          rawPending: rawPending,
          multisig: rawPending.multisig,
          approvals: rawPending.approvals,
          id: transactionID,
        })
      }
    }
    return transactions
  },
})

export const useRefreshMultisigPendingTransactions = (teamId?: string) => {
  return useRecoilRefresher_UNSTABLE(rawPendingTransactionsSelector(teamId ?? ''))
}

export const usePendingTransactions = () => {
  const aggregatedMultisigs = useRecoilValue(aggregatedMultisigsState)
  const [loaded, setLoaded] = useState(false)
  const transactionsLoadable = useRecoilValueLoadable(pendingTransactionsSelector)
  const executingTransactions = useRecoilValue(executingTransactionsState)
  const [cachedTransactions, setCachedTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setLoaded(false)
    setCachedTransactions([])
  }, [aggregatedMultisigs])

  useEffect(() => {
    if (transactionsLoadable.state === 'hasValue') {
      setLoaded(true)
      setCachedTransactions(transactionsLoadable.contents ?? [])
    }
  }, [transactionsLoadable])

  const allTransactions = useMemo(() => {
    const indexing = executingTransactions.filter(({ hash }) => !cachedTransactions.find(t => t.hash === hash))
    return [...cachedTransactions, ...indexing]
  }, [cachedTransactions, executingTransactions])

  return {
    loading: !loaded && transactionsLoadable.state === 'loading',
    transactions: allTransactions,
    error: transactionsLoadable.state === 'hasError' ? transactionsLoadable.contents : undefined,
  }
}

export const EMPTY_BALANCE: Balance = {
  token: {
    id: 'polkadot',
    coingeckoId: 'polkadot',
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/polkadot.svg',
    type: 'substrate-native',
    symbol: 'DOT',
    decimals: 10,
    chain: supportedChains.find(c => c.squidIds.chainData === 'polkadot') as Chain,
  },
  amount: new BN(0),
}

export const createImportPath = (name: string, signers: Address[], threshold: number, proxy: Address, chain: Chain) => {
  const params = {
    name,
    signers: signers.map(a => a.toSs58(chain)).join(','),
    threshold,
    proxy: proxy.toSs58(chain),
    chain_id: chain.squidIds.chainData,
  }
  return `import?${queryString.stringify(params)}`
}
