import { Transaction, extrinsicToDecoded } from '@domains/multisig'
import { gql } from 'graphql-request'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { atom, useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil'
import fetchGraphQL from '../../graphql/fetch-graphql'
import { Address, parseCallAddressArg } from '../../util/addresses'
import { pjsApiListSelector } from '../chains/pjs-api'
import { txMetadataByTeamIdState } from '../offchain-data/metadata'
import { makeTransactionID } from '../../util/misc'
import { allChainTokensSelector, decodeCallData } from '../chains'
import { usePage } from '@hooks/usePage'
import { Team } from '@domains/offchain-data'
import { useBlocksByHashes } from '@domains/chains/storage-getters'

interface RawResponse {
  data: {
    accountExtrinsics: {
      extrinsic: {
        id: string
        index: number
        callName: string
        callArgs: any
        signer: string
        block: {
          hash: string
          timestamp: string
          height: string
          chainGenesisHash: string
        }
      }
    }[]
  }
}

type ParsedTransaction = {
  block: {
    hash: string
    height: number
    timestamp: number
    chainGenesisHash: string
  }
  call: {
    name: string
    args: any
  }
  indexInBlock: number
  error?: string
  signer: string
}

export const rawConfirmedTransactionsState = atom<Record<string, { transactions: ParsedTransaction[] }>>({
  key: 'confirmedTransactionsState',
  default: {},
})

// set this to true after a tx is made
export const unknownConfirmedTransactionsState = atom<string[]>({
  key: 'unknownConfirmedTransactionsState',
  default: [],
})

type Variables = {
  query: {
    account: { address_eq: string }
    extrinsic?: { block: { chainGenesisHash_eq: string } }
  }[]
  offset: number | null
  limit: number | null
}

const signetSquidExtrinsicsQuery = gql`
  query ConfirmedTransactions($query: [AccountExtrinsicWhereInput!], $limit: Int, $offset: Int) {
    accountExtrinsics(where: { OR: $query }, orderBy: extrinsic_id_ASC, limit: $limit, offset: $offset) {
      extrinsic {
        id
        index
        callName
        callArgs
        signer
        block {
          hash
          timestamp
          height
          chainGenesisHash
        }
      }
    }
  }
`

const fetchRaw = async (accounts: { pubkey: string; chainGenesisHash?: string }[], _offset?: number | null) => {
  const extrinsics: ParsedTransaction[] = []
  if (accounts.length === 0) return { data: { extrinsics } }

  const LIMIT = 120
  const variables: Variables = {
    query: accounts.map(acc => ({
      account: { address_eq: acc.pubkey },
      ...(acc.chainGenesisHash
        ? {
            extrinsic: {
              block: {
                chainGenesisHash_eq: acc.chainGenesisHash,
              },
            },
          }
        : {}),
    })),
    offset: null,
    limit: LIMIT,
  }

  let hasNextPage = true
  let offset = _offset
  while (hasNextPage) {
    if (offset) variables.offset = offset

    const res = (await fetchGraphQL(signetSquidExtrinsicsQuery, variables, 'tx-history')) as RawResponse

    res.data.accountExtrinsics.forEach(ext => {
      extrinsics.push({
        block: {
          hash: ext.extrinsic.block.hash,
          height: parseInt(ext.extrinsic.block.height),
          timestamp: parseInt(ext.extrinsic.block.timestamp),
          chainGenesisHash: ext.extrinsic.block.chainGenesisHash,
        },
        indexInBlock: ext.extrinsic.index,
        call: {
          args: ext.extrinsic.callArgs,
          name: ext.extrinsic.callName,
        },
        signer: parseCallAddressArg(ext.extrinsic.signer),
      })
    })

    offset = res.data.accountExtrinsics.length
    hasNextPage = res.data.accountExtrinsics.length === LIMIT
  }

  return { data: { extrinsics } }
}

// transaction made from multisig + proxy via Multisig.asMulti -> Proxy.proxy call
const getMultisigCall = (
  signerString: string,
  call: { name: string; args: any }
):
  | {
      signer: Address
      otherSigners: Address[]
      maybeTimepoint: any
      threshold: number
      proxy?: {
        realAddress: Address
        proxyCallPallet: string
        proxyCallMethod: string
      }
    }
  | undefined => {
  if (call.name !== 'Multisig.as_multi') return undefined
  const multisigArgs = call.args as {
    call: {
      /** pallet name */
      __kind: string
      value: any
    }
    maybeTimepoint?: { height: number; index: number }
    otherSignatories: string[]
    threshold: number
  }

  if (multisigArgs.call.__kind === 'Multisig' && multisigArgs.call.value.__kind === 'as_multi')
    return getMultisigCall(signerString, { name: 'Multisig.as_multi', args: multisigArgs.call.value })

  // Use Address.fromPubKey for Substrate addresses and Address.fromSs58 for EVM addresses
  const signer = Address.fromPubKey(signerString) || Address.fromSs58(signerString)

  // impossible unless squid is broken
  if (!signer) {
    console.error(`Invalid signer from subsquid: ${signerString}`)
    return undefined
  }

  const otherSigners: Address[] = []
  for (const otherSigner of multisigArgs.otherSignatories) {
    // Use Address.fromPubKey for Substrate addresses and Address.fromSs58 for EVM addresses
    const address = Address.fromPubKey(otherSigner) || Address.fromSs58(otherSigner)
    if (!address) {
      console.error(`Invalid signer from subsquid: ${otherSigner}`)
      return undefined
    }
    otherSigners.push(address)
  }

  if (multisigArgs.call.__kind === 'Proxy' && multisigArgs.call.value?.__kind === 'proxy') {
    const innerProxyCall = multisigArgs.call.value as {
      /** pub key of proxied address */
      real: { value: string } | string
      call: {
        /** pallet name */
        __kind: string
        value: {
          /** call method */
          __kind: string
        }
      }
    }
    // Use Address.fromPubKey for Substrate addresses and Address.fromSs58 for EVM addresses
    const realAddress =
      Address.fromPubKey(parseCallAddressArg(innerProxyCall.real)) ||
      Address.fromSs58(parseCallAddressArg(innerProxyCall?.real))
    if (!realAddress) {
      console.error(`Invalid realAddress from subsquid: ${innerProxyCall.real}`)
      return undefined
    }

    return {
      signer,
      otherSigners,
      maybeTimepoint: multisigArgs.maybeTimepoint,
      threshold: multisigArgs.threshold,
      proxy: {
        realAddress,
        proxyCallPallet: innerProxyCall.call.__kind,
        proxyCallMethod: innerProxyCall.call.value.__kind,
      },
    }
  }

  return {
    signer,
    otherSigners,
    maybeTimepoint: multisigArgs.maybeTimepoint,
    threshold: multisigArgs.threshold,
  }
}

const isRelevantTransaction = (tx: ParsedTransaction, teams: Team[]) => {
  const multisigCall = getMultisigCall(tx.signer, tx.call)
  if (!multisigCall || !multisigCall.proxy || !multisigCall.maybeTimepoint) return false

  // TODO: get team's change log. Then check if there's any point in time where this multisig was the controller of the proxied account
  // const multisigAddress = toMultisigAddress([signer, ...otherSigners], multisigArgs.threshold)
  return teams.some(team => multisigCall.proxy?.realAddress.isEqual(team.proxiedAddress)) // not ours
}

const ROW_PER_PAGE = 10
// we will handle fetching and hydrating transactions in 3 steps
// 1. fetch all basic transactions from subsquid. This is less resource expensive and addresses rarely have more than 100 txs
// 2. every few seconds we will poll for new transactions from subsquid
// 3. filter out the portion of basic transactions that are in the page
// 4. only fetch resources for these transactions
export const useConfirmedTransactions = (teams: Team[]) => {
  const page = usePage()
  const [allTransactions, setAllTransactions] = useState<ParsedTransaction[]>()
  const [loading, setLoading] = useState(false)
  const [shouldReload, setShouldReload] = useState(false)
  const addressesToFetch = useMemo(() => teams.map(t => t.proxiedAddress.toPubKey()).join(','), [teams])
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)
  const apis = useRecoilValueLoadable(pjsApiListSelector(teams.map(t => t.chain.genesisHash)))
  const txMetadataByTeamId = useRecoilValue(txMetadataByTeamIdState)
  const nextFetchOffset = useMemo(() => allTransactions?.length, [allTransactions])
  const nextFetchRef = useRef(new Date())
  const [unknownTxs, setUnknownTxs] = useRecoilState(unknownConfirmedTransactionsState)

  // fetch if we have new unknown tx
  useEffect(() => {
    if (unknownTxs.length > 0) nextFetchRef.current = new Date()
  }, [unknownTxs.length])

  // setup auto refresh to execute when next fetch is due
  useEffect(() => {
    const interval = setInterval(() => {
      if (new Date().getTime() >= nextFetchRef.current.getTime()) setShouldReload(true)
    }, 1_000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const relevantTransactions = useMemo(
    () => allTransactions?.filter(t => isRelevantTransaction(t, teams)).reverse(),
    [allTransactions, teams]
  )
  const paginatedTransactions = useMemo(() => {
    if (!relevantTransactions) return []
    const start = (page - 1) * ROW_PER_PAGE
    return relevantTransactions.slice(start, start + ROW_PER_PAGE)
  }, [relevantTransactions, page])

  const blocksString = useMemo(
    () => (paginatedTransactions.map(tx => `${tx.block.hash}-${tx.block.chainGenesisHash}`) ?? []).join(','),
    [paginatedTransactions]
  )
  const blocksLoadable = useBlocksByHashes(blocksString)

  useEffect(() => {
    setAllTransactions(undefined)
  }, [addressesToFetch])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const all = await fetchRaw(
      teams.map(t => ({ pubkey: t.proxiedAddress.toPubKey(), chainGenesisHash: t.chain.genesisHash })),
      nextFetchOffset
    )
    setAllTransactions(prev =>
      nextFetchOffset === undefined ? all.data.extrinsics : [...(prev ?? []), ...all.data.extrinsics]
    )

    // remove unknown txs
    setUnknownTxs(prev =>
      prev.filter(
        id =>
          all.data.extrinsics.find(ext => {
            const chain = teams.find(t => t.chain.genesisHash === ext.block.chainGenesisHash)?.chain
            return chain && id.includes(makeTransactionID(chain, ext.block.height, ext.indexInBlock))
          }) === undefined
      )
    )
    setLoading(false)
    setShouldReload(false)
    nextFetchRef.current = new Date(Date.now() + (unknownTxs.length > 0 ? 3_000 : 15_000))
  }, [nextFetchOffset, setUnknownTxs, teams, unknownTxs.length])

  useEffect(() => {
    if ((allTransactions === undefined || shouldReload) && !loading) fetchAll()
  }, [allTransactions, fetchAll, loading, shouldReload])

  const transactions: Transaction[] | undefined = useMemo(() => {
    if (blocksLoadable.state !== 'hasValue' || allActiveChainTokens.state !== 'hasValue' || apis.state !== 'hasValue')
      return undefined
    const blocks = blocksLoadable.contents
    const decodedTransactions: Transaction[] = []

    paginatedTransactions.forEach(tx => {
      try {
        const block = blocks.find(b => b?.block.header.hash.toString() === tx.block.hash)
        const chain = teams.find(t => t.chain.genesisHash === tx.block.chainGenesisHash)?.chain
        const chainTokens = chain ? allActiveChainTokens.contents.get(chain.squidIds.chainData) : undefined
        const api = apis.contents[tx.block.chainGenesisHash]
        if (!block || !api || !chainTokens || !chain) return

        const multisigCall = getMultisigCall(tx.signer, tx.call)
        if (!multisigCall?.maybeTimepoint || !multisigCall.proxy) return

        // make sure this tx is for us
        const team = teams.find(
          team =>
            multisigCall.proxy?.realAddress.isEqual(team.proxiedAddress) &&
            team.chain.genesisHash === tx.block.chainGenesisHash
        )
        if (!team) return // not ours

        // get tx metadata from backend
        const id = makeTransactionID(chain, multisigCall.maybeTimepoint.height, multisigCall.maybeTimepoint.index)
        const txMetadata = txMetadataByTeamId[team.id]?.data[id]

        // get the extrinsic from block to decode
        const ext = block.block.extrinsics[tx.indexInBlock]
        if (!ext) return
        const innerExt = ext.method.args[3]! // proxy ext is 3rd arg
        const callData = innerExt.toHex()

        // decode call data
        const decodedExt = decodeCallData(api, callData as string)
        const defaultName = `${multisigCall.proxy?.proxyCallPallet}.${multisigCall.proxy.proxyCallMethod}`
        const decoded = extrinsicToDecoded(team.asMultisig, decodedExt, chainTokens, txMetadata, defaultName)
        if (decoded === 'not_ours') return

        // insert tx to top of list
        decodedTransactions.push({
          hash: tx.block.hash as `0x${string}`,
          approvals: {},
          executedAt: {
            block: tx.block.height,
            index: tx.indexInBlock,
            by: multisigCall.signer,
          },
          multisig: team.asMultisig,
          date: new Date(tx.block.timestamp),
          callData,
          id,
          ...decoded,
        })
        // txs is sorted by timestamp asc, we need to push to top of decodedTransactions to make it desc
      } catch (e) {}
    })

    return decodedTransactions
  }, [
    allActiveChainTokens.contents,
    allActiveChainTokens.state,
    apis.contents,
    apis.state,
    blocksLoadable.contents,
    blocksLoadable.state,
    paginatedTransactions,
    teams,
    txMetadataByTeamId,
  ])

  return {
    loading: transactions === undefined,
    fetching: loading,
    transactions,
    totalTransactions: relevantTransactions?.length ?? 0,
  }
}
