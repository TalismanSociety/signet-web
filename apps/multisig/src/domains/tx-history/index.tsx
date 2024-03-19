import { DUMMY_MULTISIG_ID, Transaction, extrinsicToDecoded, useSelectedMultisig } from '@domains/multisig'
import { Vec, GenericExtrinsic } from '@polkadot/types'
import type { SignedBlock } from '@polkadot/types/interfaces'
import { AnyTuple } from '@polkadot/types-codec/types'
import { gql } from 'graphql-request'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { atom, selectorFamily, useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil'
import fetchGraphQL from '../../graphql/fetch-graphql'
import { Address, parseCallAddressArg } from '../../util/addresses'
import { pjsApiListSelector, pjsApiSelector, useApi } from '../chains/pjs-api'
import { txMetadataByTeamIdState } from '../offchain-data/metadata'
import { makeTransactionID } from '../../util/misc'
import { allChainTokensSelector, decodeCallData } from '../chains'
import { usePage } from '@hooks/usePage'
import { Team } from '@domains/offchain-data'

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

type BlockCache = {
  extrinsics: Vec<GenericExtrinsic<AnyTuple>>
}
export const blockCacheState = atom<Record<string, BlockCache>>({
  key: 'blockCacheState',
  default: {},
  dangerouslyAllowMutability: true,
})

export const blockSelector = selectorFamily<SignedBlock, string>({
  key: 'blockSelector',
  get:
    blockAndChainHash =>
    async ({ get }) => {
      const [blockHash, chainHash] = blockAndChainHash.split('-') as [string, string]
      console.log('Getting block ', blockHash)
      const api = get(pjsApiSelector(chainHash))

      const block = await api.rpc.chain.getBlock(blockHash)
      return block
    },
  dangerouslyAllowMutability: true,
})

export const blocksSelector = selectorFamily<SignedBlock[], string>({
  key: 'blocksSelector',
  get:
    blockAndChainHashes =>
    async ({ get }) => {
      return await Promise.all(blockAndChainHashes.split(',').map(async bh => get(blockSelector(bh))))
    },
  dangerouslyAllowMutability: true,
})

export const useGetBlocksByHashes = (hashesAndGenesisHash: string) => {
  return useRecoilValueLoadable(blocksSelector(hashesAndGenesisHash))
}

// transaction made from multisig + proxy vault via Multisig.asMulti -> Proxy.proxy call
const getMultisigCall = (signerString: string, call: { name: string; args: any }) => {
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

  const signer = Address.fromPubKey(signerString)
  // impossible unless squid is broken
  if (!signer) {
    console.error(`Invalid signer from subsquid: ${signerString}`)
    return undefined
  }

  const otherSigners: Address[] = []
  for (const otherSigner of multisigArgs.otherSignatories) {
    const address = Address.fromPubKey(otherSigner)
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
    const realAddress = Address.fromPubKey(parseCallAddressArg(innerProxyCall.real))
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
  return teams.some(team => multisigCall.proxy.realAddress.isEqual(team.proxiedAddress)) // not ours
}

const ROW_PER_PAGE = 10
// we will handle fetching and hydrating transactions in 3 steps
// 1. fetch all basic transactions from subsquid. This is less resource expensive and addresses rarely have more than 100 txs
// 2. every few seconds we will poll for new transactions from subsquid
// 3. filter out the portion of basic transactions that are in the page
// 4. only fetch resources for these transactions
export const useConfirmed = (teams: Team[]) => {
  const page = usePage()
  const [allTransactions, setAllTransactions] = useState<ParsedTransaction[]>()
  const [loading, setLoading] = useState(false)
  const addressesToFetch = useMemo(() => teams.map(t => t.proxiedAddress.toPubKey()).join(','), [teams])
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)
  const apis = useRecoilValueLoadable(pjsApiListSelector(teams.map(t => t.chain.genesisHash)))
  const txMetadataByTeamId = useRecoilValue(txMetadataByTeamIdState)

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
  const blocksLoadable = useGetBlocksByHashes(blocksString)

  useEffect(() => {
    setAllTransactions(undefined)
  }, [addressesToFetch])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const all = await fetchRaw(
      teams.map(t => ({ pubkey: t.proxiedAddress.toPubKey(), chainGenesisHash: t.chain.genesisHash }))
    )
    setAllTransactions(all.data.extrinsics)
    setLoading(false)
  }, [teams])

  useEffect(() => {
    if (allTransactions === undefined && !loading) {
      fetchAll()
    }
  }, [allTransactions, fetchAll, loading])

  const transactions: Transaction[] | undefined = useMemo(() => {
    if (
      loading ||
      blocksLoadable.state !== 'hasValue' ||
      allActiveChainTokens.state !== 'hasValue' ||
      apis.state !== 'hasValue'
    )
      return undefined
    const blocks = blocksLoadable.contents
    const decodedTransactions: Transaction[] = []

    paginatedTransactions.forEach(tx => {
      try {
        const block = blocks.find(b => b.block.header.hash.toString() === tx.block.hash)
        const chain = teams.find(t => t.chain.genesisHash === tx.block.chainGenesisHash)?.chain
        const curChainTokens = chain ? allActiveChainTokens.contents.get(chain.squidIds.chainData) : undefined
        const api = apis.contents[tx.block.chainGenesisHash]
        if (!block || !api || !curChainTokens || !chain) return
        const multisigCall = getMultisigCall(tx.signer, tx.call)
        if (!multisigCall?.maybeTimepoint || !multisigCall.proxy) return

        const signer = Address.fromPubKey(tx.signer)
        // impossible unless squid is broken
        if (!signer) return console.error(`Invalid signer from subsquid at ${tx.block.height}-${tx.indexInBlock}`)

        // make sure this tx is for us
        if (!teams.some(team => multisigCall.proxy.realAddress.isEqual(team.proxiedAddress))) return // not ours

        const id = makeTransactionID(chain, multisigCall.maybeTimepoint.height, multisigCall.maybeTimepoint.index)

        const team = teams.find(
          team =>
            multisigCall.proxy.realAddress.isEqual(team.proxiedAddress) &&
            team.chain.genesisHash === tx.block.chainGenesisHash
        )
        if (!team) return // not ours?

        // get tx metadata from backend
        const txMetadata = txMetadataByTeamId[team.id]?.data[id]

        // get the extrinsic from block to decode
        const ext = block.block.extrinsics[tx.indexInBlock]
        if (!ext) return
        const innerExt = ext.method.args[3]! // proxy ext is 3rd arg
        const callData = innerExt.toHex()

        // decode call data
        const decodedExt = decodeCallData(api, callData as string)
        const defaultName = `${multisigCall.proxy?.proxyCallPallet}.${multisigCall.proxy.proxyCallMethod}`
        const decoded = extrinsicToDecoded(team.asMultisig, decodedExt, curChainTokens, txMetadata, defaultName)
        if (decoded === 'not_ours') return

        // insert tx to top of list
        decodedTransactions.push({
          hash: tx.block.hash as `0x${string}`,
          approvals: {},
          executedAt: {
            block: tx.block.height,
            index: tx.indexInBlock,
            by: signer,
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
    loading,
    paginatedTransactions,
    teams,
    txMetadataByTeamId,
  ])

  return {
    loading: loading || transactions === undefined,
    transactions,
    totalTransactions: relevantTransactions?.length ?? 0,
  }
}

export const useConfirmedTransactions = (): { loading: boolean; transactions: Transaction[] } => {
  const [loading, setLoading] = useState(true)
  const [selectedMultisig] = useSelectedMultisig()
  const [target, setTarget] = useState(selectedMultisig)
  const { api } = useApi(selectedMultisig.chain.genesisHash)
  const [confirmedTransactions, setConfirmedTransactions] = useRecoilState(rawConfirmedTransactionsState)
  const [unknownTxs, setUnknownTxs] = useRecoilState(unknownConfirmedTransactionsState)
  const txMetadataByTeamId = useRecoilValue(txMetadataByTeamIdState)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const nextFetchRef = useRef(new Date())
  const [blockCache, setBlockCache] = useRecoilState(blockCacheState)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)

  // fetch if we have new unknown tx
  useEffect(() => {
    if (unknownTxs.length > 0) nextFetchRef.current = new Date()
  }, [unknownTxs.length])

  // setup auto refresh to execute when next fetch is due
  useEffect(() => {
    let interval = setInterval(() => {
      if (new Date().getTime() > nextFetchRef.current.getTime()) setAutoRefresh(true)
    }, 1_000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const getBlocks = useCallback(
    async (hashes: string[]) => {
      if (!api) return []

      try {
        const newBlocks = await Promise.all(
          hashes.filter(hash => !blockCache[hash]).map(hash => api.rpc.chain.getBlock(hash))
        )

        const newBlocksMap = newBlocks.reduce((acc, block) => {
          acc[block.block.header.hash.toString()] = {
            extrinsics: block.block.extrinsics,
          }
          return acc
        }, {} as Record<string, BlockCache>)

        setBlockCache(old => ({ ...old, ...newBlocksMap }))
      } catch (e) {
        console.error(e)
      }
    },
    [api, blockCache, setBlockCache]
  )

  const processedTransactions = useMemo(() => {
    try {
      if (allActiveChainTokens.state !== 'hasValue') return { decodedTransactions: [] }
      const txs = confirmedTransactions[selectedMultisig.id]?.transactions ?? []
      const decodedTransactions: Transaction[] = []
      const curChainTokens = allActiveChainTokens.contents.get(selectedMultisig.chain.squidIds.chainData)

      txs.forEach(tx => {
        try {
          const block = blockCache[tx.block.hash]
          if (!block || !api || !curChainTokens) return
          if (tx.call.name === 'Multisig.as_multi') {
            const multisigArgs = tx.call.args as {
              call: {
                /** pallet name */
                __kind: string
                value: any
              }
              maybeTimepoint?: { height: number; index: number }
              otherSignatories: string[]
              threshold: number
            }

            if (!multisigArgs.maybeTimepoint) return

            const signer = Address.fromPubKey(tx.signer)
            // impossible unless squid is broken
            if (!signer) return console.error(`Invalid signer from subsquid at ${tx.block.height}-${tx.indexInBlock}`)
            const otherSigners: Address[] = []
            for (const otherSigner of multisigArgs.otherSignatories) {
              const address = Address.fromPubKey(otherSigner)
              if (!address) throw Error('squid returned invalid pubkey!')
              otherSigners.push(address)
            }

            // TODO: get team's change log. Then check if there's any point in time where this multisig was the controller of the proxied account
            // const multisigAddress = toMultisigAddress([signer, ...otherSigners], multisigArgs.threshold)

            // transaction made from multisig + proxy vault via Multisig.asMulti -> Proxy.proxy call
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

              // make sure this tx is for us
              const realAddress = Address.fromPubKey(parseCallAddressArg(innerProxyCall.real))
              if (!realAddress)
                return console.error(`Invalid realAddress from subsquid at ${tx.block.height}-${tx.indexInBlock}`)
              if (!realAddress.isEqual(selectedMultisig.proxyAddress)) return // not ours

              const id = makeTransactionID(
                selectedMultisig.chain,
                multisigArgs.maybeTimepoint.height,
                multisigArgs.maybeTimepoint.index
              )

              // get tx metadata from backend
              const txMetadata = txMetadataByTeamId[selectedMultisig.id]?.data[id]

              // get the extrinsic from block to decode
              const ext = block.extrinsics[tx.indexInBlock]
              if (!ext) return
              const innerExt = ext.method.args[3]! // proxy ext is 3rd arg
              const callData = innerExt.toHex()

              // decode call data
              const decodedExt = decodeCallData(api, callData as string)
              const defaultName = `${innerProxyCall.call.__kind}.${innerProxyCall.call.value.__kind}`
              const decoded = extrinsicToDecoded(selectedMultisig, decodedExt, curChainTokens, txMetadata, defaultName)
              if (decoded === 'not_ours') return

              // insert tx to top of list
              decodedTransactions.unshift({
                hash: tx.block.hash as `0x${string}`,
                approvals: {},
                executedAt: {
                  block: tx.block.height,
                  index: tx.indexInBlock,
                  by: signer,
                },
                multisig: selectedMultisig,
                date: new Date(tx.block.timestamp),
                callData,
                id,
                ...decoded,
              })
              // txs is sorted by timestamp asc, we need to push to top of decodedTransactions to make it desc
            }
          }
        } catch (e) {}
      })

      return { decodedTransactions }
    } catch (e) {
      console.error(e)
      return { decodedTransactions: [] }
    }
  }, [
    allActiveChainTokens.contents,
    allActiveChainTokens.state,
    api,
    blockCache,
    confirmedTransactions,
    selectedMultisig,
    txMetadataByTeamId,
  ])

  const load = useCallback(async () => {
    // make sure we dont spam squid
    if (target.id === DUMMY_MULTISIG_ID || new Date().getTime() < nextFetchRef.current.getTime() || !api) return

    // cache the target in case it gets changed while we're fetching
    const fetchingFor = target
    setLoading(true)

    // refresh every 15 seconds by default. If a new tx is confirmed, refresh in 3 seconds
    nextFetchRef.current = new Date(Date.now() + (unknownTxs.length > 0 ? 3_000 : 15_000))

    try {
      const lastFetchedData = confirmedTransactions[fetchingFor.id]

      // get all raw transactions from last cursor
      const {
        data: { extrinsics },
      } = await fetchRaw(
        [{ pubkey: fetchingFor.proxyAddress.toPubKey(), chainGenesisHash: fetchingFor.chain.genesisHash }],
        lastFetchedData?.transactions.length
      )

      if (extrinsics.length > 0) {
        setConfirmedTransactions(old => ({
          ...old,
          [fetchingFor.id]: {
            transactions: [
              ...(lastFetchedData?.transactions ?? []),
              ...extrinsics.filter(ext => ext.block.chainGenesisHash === fetchingFor.chain.genesisHash),
            ],
          },
        }))
      }

      // get the blocks and store in cache for use later
      await getBlocks(extrinsics.map(ext => ext.block.hash))

      setUnknownTxs(prev =>
        prev.filter(
          id =>
            extrinsics.find(ext => makeTransactionID(fetchingFor.chain, ext.block.height, ext.indexInBlock) === id) ===
            undefined
        )
      )
    } catch (e) {
      console.error('Failed to fetch squid', e)
    } finally {
      setLoading(false)
      setAutoRefresh(false)

      // no immediate refresh needed while we were fetching, and we have the latest result
      // so push next fetch time back
      if (new Date().getTime() < nextFetchRef.current.getTime())
        nextFetchRef.current = new Date(Date.now() + (unknownTxs.length > 0 ? 3_000 : 15_000))
    }
  }, [api, confirmedTransactions, getBlocks, setConfirmedTransactions, setUnknownTxs, target, unknownTxs.length])

  /**
   * Triggered when:
   * 1. selectedMultisig changes
   * 2. autoRefresh is true (when nextFetch is due, 15 seconds by default, 2 seconds when we are expecting new txs)
   * 3. hasUnknown is true (instant refresh when new tx is made)
   */
  useEffect(() => {
    load()
  }, [load, autoRefresh])

  // this will make sure changing vault only triggers 1 reload
  useEffect(() => {
    if (target.id === selectedMultisig.id) return
    setTarget(selectedMultisig)
    nextFetchRef.current = new Date()
  }, [selectedMultisig, target.id])

  return { loading: loading || !api, transactions: processedTransactions.decodedTransactions }
}
