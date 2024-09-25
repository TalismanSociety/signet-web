import { useCallback, useEffect, useMemo, useState } from 'react'
import { atom, useRecoilState, useRecoilValue } from 'recoil'
import { ChangeConfigDetails, aggregatedMultisigsState } from '../multisig'
import { activeTeamsState, teamsState } from './teams'
import { gql } from 'graphql-tag'
import { requestSignetBackend } from './hasura'
import { SignedInAccount, selectedAccountState } from '../auth'
import { isEqual } from 'lodash'
import { Multisig } from '../multisig/index'
import toast from 'react-hot-toast'
import { Address } from '../../util/addresses'
import { useMutation } from '@apollo/client'
import { TxMetadata, RawTxMetadata } from '@domains/offchain-data/metadata/types'
import { parseTxMetadata } from '@domains/offchain-data/metadata/utils'

// TODO: should handle pagination
const TX_METADATA_QUERY = gql`
  query TxMetadata($teamIds: [uuid!]!) {
    tx_metadata(where: { team_id: { _in: $teamIds } }, order_by: { created: desc }, limit: 300) {
      team_id
      timepoint_height
      timepoint_index
      chain
      call_data
      change_config_details
      created
      description
      other_metadata
    }
  }
`

// TODO: add more properties to support pagination
type TxMetadataByTeamId = Record<string, { data: Record<string, TxMetadata> }>

// txMetadataByTeamId.teamId.data.txId = TxMetadata
export const txMetadataByTeamIdState = atom<TxMetadataByTeamId>({
  key: 'txMetadataByTeamId',
  default: {},
  dangerouslyAllowMutability: true,
})

export const txMetadataLoadingState = atom({
  key: 'txMetadataLoading',
  default: false,
})

const getTransactionsMetadata = async (teamIds: string[], signedInAccount: SignedInAccount): Promise<TxMetadata[]> => {
  try {
    const { data } = await requestSignetBackend<{ tx_metadata: RawTxMetadata[] }>(
      TX_METADATA_QUERY,
      { teamIds },
      signedInAccount
    )
    const txMetadataList: TxMetadata[] = []
    if (data && data.tx_metadata) {
      data.tx_metadata.forEach(rawMetadata => {
        try {
          txMetadataList.push(parseTxMetadata(rawMetadata))
        } catch (e) {
          console.error(`Found invalid tx_metadata: ${rawMetadata}`)
          console.error(e)
        }
      })
    }

    return txMetadataList
  } catch (e) {
    console.error(e)
    return []
  }
}
// need to make sure this syncs every X seconds
export const TxMetadataWatcher = () => {
  const signedInAccount = useRecoilValue(selectedAccountState)
  const multisigs = useRecoilValue(aggregatedMultisigsState)
  const teams = useRecoilValue(activeTeamsState)
  const [txMetadataByTeamId, setTxMetadataByTeamId] = useRecoilState(txMetadataByTeamIdState)
  const [initiated, setInitiated] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  const fetchMetadata = useCallback(async () => {
    if (!teams || !signedInAccount || teams.length === 0) return

    setLoading(true)
    try {
      const teamIds = teams.map(t => t.id)
      // only fetch metadata for active multisigs that are stored in db
      const idsToQuery = multisigs.map(m => m.id).filter(id => teamIds.includes(id))
      const txMetadataList = await getTransactionsMetadata(idsToQuery, signedInAccount)

      const newTxMetadataByTeamId: TxMetadataByTeamId = {}
      Object.entries(txMetadataByTeamId).forEach(([teamId, txMetadata]) => {
        newTxMetadataByTeamId[teamId] = txMetadata
      })

      txMetadataList.forEach(txMetadata => {
        if (!newTxMetadataByTeamId[txMetadata.teamId]) newTxMetadataByTeamId[txMetadata.teamId] = { data: {} }

        newTxMetadataByTeamId[txMetadata.teamId]!.data[txMetadata.extrinsicId] = txMetadata
      })

      if (isEqual(newTxMetadataByTeamId, txMetadataByTeamId)) return
      setTxMetadataByTeamId(newTxMetadataByTeamId)
    } catch (e) {
    } finally {
      setLoading(false)
      setInitiated(true)
      setLastFetched(new Date())
    }
  }, [multisigs, setTxMetadataByTeamId, signedInAccount, teams, txMetadataByTeamId])

  const multisigsId = useMemo(() => multisigs?.map(t => t.id).join(' ') ?? '', [multisigs])

  // instantly trigger call if multisigs are changed
  useEffect(() => {
    setInitiated(false)
    setLoading(false)
  }, [multisigsId])

  // first initial call before interval gets triggered
  useEffect(() => {
    if (initiated || loading) return
    fetchMetadata()
  }, [fetchMetadata, initiated, loading])

  // refresh data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (new Date().getTime() < lastFetched.getTime() + 5_000 || loading) return
      fetchMetadata()
    }, 5_000)
    return () => clearInterval(interval)
    // trigger refetch if the multisigs being watched is changed
  }, [fetchMetadata, lastFetched, loading, multisigsId])

  return null
}

const INSERT_TX_METADATA_GQL = gql`
  mutation InsertTxMetadata($object: tx_metadata_insert_input!) {
    insert_tx_metadata_one(object: $object) {
      timepoint_index
      timepoint_index
    }
  }
`

// handles inserting tx metadata to db, as well as fast insert into cache
export const useInsertTxMetadata = () => {
  const [txMetadataByTeamId, setTxMetadataByTeamId] = useRecoilState(txMetadataByTeamIdState)
  const teams = useRecoilValue(teamsState)
  const [insertTx] = useMutation<any, { object: Omit<RawTxMetadata, 'created'> }>(INSERT_TX_METADATA_GQL)

  const insertMetadata = useCallback(
    async (
      multisig: Multisig,
      other: Pick<
        TxMetadata,
        'callData' | 'changeConfigDetails' | 'description' | 'timepointHeight' | 'timepointIndex' | 'contractDeployed'
      > & { hash: string; extrinsicId: string }
    ) => {
      // make sure multisig is stored in db
      if (!teams || !teams.find(team => team.id === multisig.id)) return

      const newTxMetadataByTeamId: TxMetadataByTeamId = {}
      Object.entries(txMetadataByTeamId).forEach(([teamId, txMetadata]) => {
        newTxMetadataByTeamId[teamId] = txMetadata
      })

      const rawTxMetadata: Omit<RawTxMetadata, 'created'> = {
        team_id: multisig.id,
        chain: multisig.chain.id,
        proxy_address: multisig.proxyAddress.toSs58(),
        multisig_address: multisig.multisigAddress.toSs58(),
        call_data: other.callData,
        description: other.description,
        timepoint_index: other.timepointIndex,
        timepoint_height: other.timepointHeight,
        change_config_details: other.changeConfigDetails
          ? {
              newMembers: other.changeConfigDetails.newMembers.map(addr => addr.toSs58()),
              newThreshold: other.changeConfigDetails.newThreshold,
            }
          : null,
        other_metadata: other.contractDeployed
          ? {
              contractDeployed: {
                abiString: JSON.stringify(other.contractDeployed.abi.json),
                name: other.contractDeployed.name,
              },
            }
          : null,
      }

      // save metadata to in-memory cache
      const metadata = parseTxMetadata({ ...rawTxMetadata, created: new Date().toString() })
      if (!newTxMetadataByTeamId[multisig.id]) newTxMetadataByTeamId[multisig.id] = { data: {} }
      newTxMetadataByTeamId[multisig.id]!.data[other.extrinsicId] = metadata
      setTxMetadataByTeamId(newTxMetadataByTeamId)

      // store metadata to db
      insertTx({ variables: { object: rawTxMetadata } })
        .then(() => {
          console.log(`Successfully POSTed metadata for ${other.extrinsicId} to metadata service`)
        })
        .catch(e => {
          console.error('Failed to POST tx metadata sharing service: ', e)
          toast.error('Failed to POST tx metadata sharing service. See console for more info.')
        })
    },
    [insertTx, setTxMetadataByTeamId, teams, txMetadataByTeamId]
  )

  return insertMetadata
}

interface TxMetadataByPkResponseRaw {
  tx_metadata: {
    change_config_details: {
      newThreshold: number
      newMembers: string[]
    }
  }[]
}

export async function getAllChangeAttempts(
  multisig: Multisig,
  acc?: SignedInAccount | null
): Promise<ChangeConfigDetails[]> {
  if (!acc) return []

  const variables = {
    teamId: multisig.id,
    multisigAddress: multisig.multisigAddress.toSs58(),
    chain: multisig.chain.id,
  }

  const query = gql`
    query AllChangeConfigAttempts($teamId: uuid!, $multisigAddress: String!, $chain: String!) {
      tx_metadata(
        where: {
          team_id: { _eq: $teamId }
          multisig_address: { _eq: $multisigAddress }
          chain: { _eq: $chain }
          change_config_details: { _is_null: false }
        }
      ) {
        change_config_details
      }
    }
  `

  const res = await requestSignetBackend<TxMetadataByPkResponseRaw>(query, variables, acc)

  return (
    res.data?.tx_metadata.map(tx => {
      return {
        newThreshold: tx.change_config_details.newThreshold,
        newMembers: tx.change_config_details.newMembers.map(m => {
          const address = Address.fromSs58(m)
          if (!address) throw new Error(`Invalid address returned from tx_metadata!`)
          return address
        }),
      }
    }) ?? []
  )
}
