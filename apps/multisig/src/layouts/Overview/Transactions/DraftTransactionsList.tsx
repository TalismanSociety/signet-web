import {
  ChangeConfigDetails,
  DUMMY_MULTISIG_ID,
  Transaction,
  TransactionApprovals,
  useSelectedMultisig,
} from '@domains/multisig'
import { useHasura } from '@domains/offchain-data/hasura'
import { gql } from 'graphql-tag'
import { useEffect, useMemo } from 'react'
import { allChainTokensSelector } from '@domains/chains'
import { useRecoilValueLoadable } from 'recoil'
import { innerCalldataToTransaction } from '@domains/multisig/innerCalldataToTransaction'
import { useApi } from '@domains/chains/pjs-api'
import { TransactionsList } from './TransactionsList'
import { Address } from '@util/addresses'

type Props = {
  value: string
}

type TxMetadataDraftRaw = {
  id: string
  team_id: string
  creator: {
    id: string
    identifier: string
    identifier_type: string
  }
  created_at: string
  change_config_details: any
  call_data: string
  description: string
}

const DRAFT_QUERY = gql`
  query GetDraftTransactions($teamId: uuid!) {
    tx_metadata_draft(where: { team_id: { _eq: $teamId }, status: { _eq: "draft" } }, order_by: { created_at: desc }) {
      id
      team_id
      creator {
        id
        identifier
        identifier_type
      }
      created_at
      change_config_details
      call_data
      description
    }
  }
`
export const DraftTransactionsList: React.FC<Props> = ({ value }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)
  const { data, loading, refetch } = useHasura<{
    tx_metadata_draft: TxMetadataDraftRaw[]
  }>(DRAFT_QUERY, {
    skip: selectedMultisig.id === DUMMY_MULTISIG_ID,
    fetchPolicy: 'cache-and-network',
    initialFetchPolicy: 'network-only',
    variables: {
      teamId: selectedMultisig.id,
    },
  })

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch({
        teamId: selectedMultisig.id,
      })
    }, 10000)

    return () => {
      clearInterval(intervalId)
    }
  }, [refetch, selectedMultisig.id])

  const parsedTransactions = useMemo(() => {
    if (allActiveChainTokens.state !== 'hasValue') return undefined
    const curChainTokens = allActiveChainTokens.contents.get(selectedMultisig.chain.squidIds.chainData)

    if (!data?.tx_metadata_draft || !api || !curChainTokens) return []
    const parsed: Transaction[] = []

    data.tx_metadata_draft.forEach(tx => {
      try {
        const createdDate = new Date(tx.created_at)
        let changeConfigDetails: ChangeConfigDetails | undefined
        if (tx.change_config_details) {
          const signers: Address[] = []
          for (const addr of tx.change_config_details.newMembers) {
            const signerAddress = Address.fromSs58(addr)
            if (!signerAddress) return console.error('Invalid change vault details in tx: ', tx.id)
            signers.push(signerAddress)
          }

          const newThreshold = +tx.change_config_details.newThreshold
          if (Number.isNaN(newThreshold)) return console.error('Invalid change vault details in tx: ', tx.id)

          if (signers.length > 0 && newThreshold > 0)
            changeConfigDetails = {
              newMembers: signers,
              newThreshold,
            }
        }

        const { transaction } = innerCalldataToTransaction(
          tx.call_data as `0x${string}`,
          selectedMultisig,
          api,
          curChainTokens,
          { changeConfigDetails }
        )
        if (!transaction) return

        const creatorAddress = Address.fromSs58(tx.creator.identifier)
        if (!creatorAddress) return console.error('Invalid creator address in tx: ', tx.id)
        parsed.push({
          hash: transaction.hash,
          decoded: transaction.decoded,
          approvals: selectedMultisig.signers.reduce((acc, key) => {
            acc[key.toPubKey()] = false
            return acc
          }, {} as TransactionApprovals),
          multisig: selectedMultisig,
          date: createdDate,
          description: tx.description,
          callData: tx.call_data as `0x${string}`,
          draft: {
            createdAt: createdDate,
            id: tx.id,
            creator: {
              id: tx.creator.id,
              address: creatorAddress,
            },
          },
        })
      } catch (e) {}
    })

    return parsed
  }, [allActiveChainTokens.contents, allActiveChainTokens.state, api, data?.tx_metadata_draft, selectedMultisig])

  return (
    <TransactionsList transactions={parsedTransactions ?? []} loading={loading || !parsedTransactions} value={value} />
  )
}
