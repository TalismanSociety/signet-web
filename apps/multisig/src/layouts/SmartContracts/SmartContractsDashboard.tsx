import { Button } from '@components/ui/button'
import { useCallback } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { useContractPallet } from '@domains/substrate-contracts'
import { CircularProgressIndicator } from '@talismn/ui'
import { SmartContract, useSmartContracts } from '@domains/offchain-data'
import { StatusMessage } from '@components/StatusMessage'
import { Check, Contract, Copy, Trash } from '@talismn/icons'
import useCopied from '@hooks/useCopied'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from '@components/ui/tooltip'

const Header: React.FC<{ loading: boolean; supported?: boolean }> = ({ loading, supported }) => (
  <div className="flex flex-col gap-[16px] w-full">
    <div className="w-full">
      <div className="w-full flex items-center justify-between gap-[16px] mb-[8px]">
        <div css={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 css={({ color }) => ({ color: color.offWhite, marginTop: 4 })}>Smart Contracts</h2>
        </div>
        {supported && (
          <div className="flex items-center gap-[12px]">
            <Button variant="outline" size="lg" asLink to="/smart-contracts/add">
              Add existing
            </Button>
            <Button variant="outline" size="lg" asLink to="/smart-contracts/deploy">
              Deploy New
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <CircularProgressIndicator />
      ) : supported ? (
        <p>Interact with existing contracts and deploy new contracts from your Vault.</p>
      ) : (
        <p>Smart contracts not supported on this network.</p>
      )}
    </div>
  </div>
)

const NoContracts: React.FC<{ onDeploy: () => void; onInteract: () => void }> = ({ onDeploy, onInteract }) => (
  <div className="flex items-center flex-col justify-center gap-[24px] bg-gray-800 rounded-[12px] w-full px-[16px] py-[32px]">
    <p className="text-center text-[16px]">You have no added smart contracts yet.</p>
  </div>
)

const ContractRow: React.FC<{ contract: SmartContract }> = ({ contract }) => {
  const navigate = useNavigate()
  const [selectedMultisig] = useSelectedMultisig()
  const { copied, copy } = useCopied()

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      copy(contract.address.toSs58(selectedMultisig.chain), 'Copied contract address!')
    },
    [contract.address, copy, selectedMultisig.chain]
  )

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // TODO: handle delete
  }, [])

  const handleSelect = useCallback(() => {
    navigate(`/smart-contracts/call/${contract.id}`)
  }, [contract.id, navigate])

  return (
    <div
      className="flex items-center justify-between bg-gray-800 rounded-[8px] p-[16px] hover:bg-gray-700 cursor-pointer"
      onClick={handleSelect}
    >
      <div className="flex items-center gap-[8px]">
        <div className="flex items-center justify-center bg-primary/20 text-primary h-[36px] w-[36px] rounded-full">
          <Contract size={20} />
        </div>
        <div>
          <p className="text-offWhite">{contract.name}</p>
          <p className="text-[12px]">{contract.address.toShortSs58(selectedMultisig.chain)}</p>
        </div>
      </div>
      <div className="flex items-center gap-[8px]">
        <Tooltip content={copied ? 'Copied contract address!' : 'Copy contract address'}>
          <Button size="icon" variant="ghost" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </Tooltip>
        <Tooltip content="Remove contract from vault">
          <Button size="icon" variant="ghost" onClick={handleDelete}>
            <Trash size={16} />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
export const SmartContractsDashboard: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading, supported } = useContractPallet(api)
  const handleAddContract = useCallback(() => {}, [])

  const { contracts } = useSmartContracts()

  return (
    <div className="flex flex-col pl-[0px] lg:px-[4%] py-[16px] gap-[16px] flex-1">
      <Header supported={supported} loading={loading} />
      {supported ? (
        contracts === undefined ? (
          <StatusMessage type="loading" message="Loading your contracts..." />
        ) : contracts.length === 0 ? (
          <NoContracts onDeploy={handleAddContract} onInteract={() => {}} />
        ) : (
          <div className="grid gap-[16px]">
            {contracts.map(contract => (
              <ContractRow key={contract.id} contract={contract} />
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
