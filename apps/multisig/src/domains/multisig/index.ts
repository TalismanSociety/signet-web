import { BaseToken, Chain, chainTokensByIdQuery, filteredSupportedChains, supportedChains } from '@domains/chains'
import { TransactionType } from '@domains/offchain-data/metadata/types'
import { rawPendingTransactionsSelector } from '@domains/chains/storage-getters'
import { InjectedAccount, accountsState } from '@domains/extension'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Address, parseCallAddressArg } from '@util/addresses'
import BN from 'bn.js'
import queryString from 'query-string'
import { atom, selector, useRecoilRefresher_UNSTABLE, useRecoilState, useRecoilValue } from 'recoil'
import persistAtom from '../persist'
import { selectedAccountState } from '../auth'
import { TxMetadata } from '@domains/offchain-data/metadata/types'
import { Multisig } from './types'
import { activeTeamsState } from '@domains/offchain-data'
import { Abi } from '@polkadot/api-contract'
import { DUMMY_MULTISIG_ID } from '@util/constants'
import { Balance, TransactionDecoded, TransactionApprovals, Transaction } from '@domains/offchain-data/metadata/types'
import { txDecoders } from './tx-decoders'

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

interface ProxyCall {
  section: 'proxy'
  method: 'proxy'
  args: any
}

const isProxyCall = (arg: any): arg is ProxyCall => {
  return arg?.section === 'proxy' && arg?.method === 'proxy'
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

    for (const arg of args) {
      const obj: any = arg.toHuman()

      // attempt to decode tx with a list of known decoders
      const decoded = txDecoders
        .map(decoder => decoder({ methodArg: obj, extrinsic, tokens: chainTokens, metadata, multisig }))
        .filter(Boolean)

      // not supposed to have 2 valid decoders for the same extrinsic
      if (decoded.length > 1)
        console.warn('Extrinsic able to be decoded as multiple types. This is not supposed to happen.', decoded)

      const [decodedTx] = decoded

      // tx decoded!
      if (decodedTx) return decodedTx
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
