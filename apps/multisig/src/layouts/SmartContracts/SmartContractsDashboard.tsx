import { Button } from '@components/ui/button'
import { useCallback } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { useContractPallet } from '@domains/substrate-contracts'
import { CircularProgressIndicator } from '@talismn/ui'

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
    {/* <div className="flex items-center gap-[24px]">
      <Button onClick={onInteract} asLink to="/smart-contracts/add">
        Add existing
      </Button>
      <Button variant="outline" onClick={onDeploy} asLink to="/smart-contracts/deploy">
        Deploy new
      </Button>
    </div> */}
  </div>
)

export const SmartContractsDashboard: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading, supported } = useContractPallet(api)
  const handleAddContract = useCallback(() => {}, [])

  return (
    <div className="flex flex-col px-[8%] py-[32px] gap-[24px] flex-1">
      <Header supported={supported} loading={loading} />
      {supported ? <NoContracts onDeploy={handleAddContract} onInteract={() => {}} /> : null}
    </div>
  )
}
