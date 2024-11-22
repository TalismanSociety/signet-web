import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { selectedAccountState } from '@domains/auth'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { useSelectedMultisig } from '@domains/multisig'
import { TxMetadata, RawTxMetadata } from '@domains/offchain-data/metadata/types'
import { TXS_METADATA_BY_TIMEPOINTS } from '@domains/offchain-data/metadata/queries'
import { parseTxMetadata } from '../utils'

const fetchGraphQLData = async ({
  teamId,
  chainId,
  signedInAccount,
}: {
  teamId: string

  chainId: string
  signedInAccount: SignedInAccount
}): Promise<TxMetadata[]> => {
  try {
    const { data } = await requestSignetBackend<{ tx_metadata: RawTxMetadata[] }>(
      TXS_METADATA_BY_TIMEPOINTS,
      { teamId, chainId },
      signedInAccount
    )
    const txMetadataList: TxMetadata[] = []
    if (data && data.tx_metadata) {
      data.tx_metadata.forEach(rawMetadata => {
        try {
          txMetadataList.push(parseTxMetadata(rawMetadata))
        } catch (e) {
          console.error(`Found invalid tx_metadata: ${rawMetadata}`)
        }
      })
    }

    return txMetadataList
  } catch (e) {
    console.error(e)
    return []
  }
}

const useGetTxsMetadata = () => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()

  return useQuery({
    queryKey: ['txMetadataByTimepoints', selectedMultisig.id],
    queryFn: async () =>
      fetchGraphQLData({
        teamId: selectedMultisig.id,
        chainId: selectedMultisig.chain.id,
        signedInAccount: selectedAccount!,
      }),
    enabled: !!selectedAccount,
    placeholderData: keepPreviousData,
  })
}

export default useGetTxsMetadata
