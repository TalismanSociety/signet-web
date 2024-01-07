import { useSelectedMultisig } from '@domains/multisig'
import { useSmartContracts } from '@domains/offchain-data'
import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Address } from '@util/addresses'
import { useMemo } from 'react'

export const useContractByAddress = (address?: Address, api?: ApiPromise) => {
  const [selectedMultisig] = useSelectedMultisig()
  const { loading, contractsByAddress } = useSmartContracts()

  const contractDetails = useMemo(() => {
    if (!address) return undefined
    return contractsByAddress?.[address.toSs58()]
  }, [address, contractsByAddress])

  const contract = useMemo(() => {
    if (!contractDetails || !api) return undefined
    return new ContractPromise(api, contractDetails.abiString, contractDetails.address.toSs58(selectedMultisig.chain))
  }, [contractDetails, api, selectedMultisig.chain])

  return { contract, loading, contractDetails }
}
