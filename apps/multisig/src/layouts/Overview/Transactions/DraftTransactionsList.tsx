import { ChangeConfigDetails, ContractDetails, useSelectedMultisig } from '@domains/multisig'
import { Transaction, TransactionApprovals } from '@domains/offchain-data/metadata/types'
import { DUMMY_MULTISIG_ID } from '@util/constants'
import { useHasura } from '@domains/offchain-data/hasura'
import { useMemo } from 'react'
import { allChainTokensSelector } from '@domains/chains'
import { useRecoilValueLoadable } from 'recoil'
import { innerCalldataToTransaction } from '@domains/multisig/innerCalldataToTransaction'
import { useApi } from '@domains/chains/pjs-api'
import { TransactionsList } from './TransactionsList'
import { Address } from '@util/addresses'
import { GET_TX_METADATA_DRAFT_QUERY, TxMetadataDraftRaw } from '@domains/offchain-data/tx-metadata-draft'
import { Abi } from '@polkadot/api-contract'

type Props = {
  value: string
}

export const DraftTransactionsList: React.FC<Props> = ({ value }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.genesisHash)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)
  const { data, loading } = useHasura<{
    tx_metadata_draft: TxMetadataDraftRaw[]
  }>(GET_TX_METADATA_DRAFT_QUERY, {
    skip: selectedMultisig.id === DUMMY_MULTISIG_ID,
    fetchPolicy: 'cache-and-network',
    initialFetchPolicy: 'network-only',
    variables: {
      teamId: selectedMultisig.id,
    },
    pollInterval: 10_000,
  })

  const parsedTransactions = useMemo(() => {
    if (allActiveChainTokens.state !== 'hasValue') return undefined
    const curChainTokens = allActiveChainTokens.contents.get(selectedMultisig.chain.id)

    if (!data?.tx_metadata_draft || !api || !curChainTokens) return undefined

    const parsed: Transaction[] = []
    data.tx_metadata_draft.forEach(tx => {
      try {
        const createdDate = new Date(tx.created_at)
        let changeConfigDetails: ChangeConfigDetails | undefined
        if (tx.change_config_details) {
          const signers: Address[] = []
          for (const addr of tx.change_config_details.newMembers) {
            const signerAddress = Address.fromSs58(addr)
            if (!signerAddress) return console.error('Invalid change multisig details in tx: ', tx.id)
            signers.push(signerAddress)
          }

          const newThreshold = +tx.change_config_details.newThreshold
          if (Number.isNaN(newThreshold)) return console.error('Invalid change multisig details in tx: ', tx.id)

          if (signers.length > 0 && newThreshold > 0)
            changeConfigDetails = {
              newMembers: signers,
              newThreshold,
            }
        }

        let contractDeployed: ContractDetails | undefined
        if (tx.other_metadata && tx.other_metadata.contractDeployed) {
          try {
            contractDeployed = {
              abi: new Abi(tx.other_metadata.contractDeployed.abiString as string),
              name: tx.other_metadata.contractDeployed.name,
            }
          } catch (e) {}
        }

        const { transaction } = innerCalldataToTransaction(
          tx.call_data as `0x${string}`,
          selectedMultisig,
          api,
          curChainTokens,
          { changeConfigDetails, contractDeployed }
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
          callData: transaction.calldata as `0x${string}`,
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
    <TransactionsList
      transactions={parsedTransactions ?? []}
      loading={loading || !parsedTransactions}
      value={value}
      totalTransactions={parsedTransactions?.length}
    />
  )
}
