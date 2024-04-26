import AddressInput from '@components/AddressInput'
import { AmountFlexibleInput } from '@components/AmountFlexibleInput'
import { BaseToken, Chain, vestingConstsSelector } from '@domains/chains'
import { useSelectedMultisig } from '@domains/multisig'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Address } from '@util/addresses'
import { Button } from '@components/ui/button'
import { NewTransactionHeader } from '../NewTransactionHeader'
import { hasPermission } from '@domains/proxy/util'
import { Alert } from '@components/Alert'
import { Send } from '@talismn/icons'
import { Input } from '@components/ui/input'
import { BlockInput } from '@components/BlockInput'
import { secondsToDuration } from '@util/misc'
import { Switch } from '@components/ui/switch'
import BN from 'bn.js'
import { useMemo } from 'react'
import { Skeleton } from '@talismn/ui'
import { useRecoilValueLoadable } from 'recoil'

export type VestedSendConfig = {
  on: boolean
  endBlock: number
  startBlock: number
  amountByBlock: boolean
}

type Props = {
  destinationAddress?: Address
  amount: string
  name: string
  chain: Chain
  setName: (n: string) => void
  selectedToken: BaseToken | undefined
  setSelectedToken: (t: BaseToken) => void
  tokens: BaseToken[]
  setDestinationAddress: (address?: Address) => void
  setAmount: (a: string) => void
  onNext: () => void
  vestedConfig: VestedSendConfig
  onChangeVestedConfig: (vestedConfig: VestedSendConfig) => void
  currentBlock?: number
  blockTime?: number
  amountPerBlockBn?: BN
  vestingSupported?: boolean
  loading?: boolean
}

export const DetailsForm: React.FC<Props> = ({
  amount,
  amountPerBlockBn,
  chain,
  name,
  onNext,
  selectedToken,
  setAmount,
  setDestinationAddress,
  setName,
  setSelectedToken,
  tokens,
  destinationAddress,
  vestedConfig,
  currentBlock,
  blockTime,
  onChangeVestedConfig,
  vestingSupported,
  loading,
}) => {
  const [multisig] = useSelectedMultisig()
  const { addresses } = useKnownAddresses(multisig.orgId)
  const { hasDelayedPermission, hasNonDelayedPermission } = hasPermission(multisig, 'transfer')
  const vestingConsts = useRecoilValueLoadable(vestingConstsSelector(multisig.chain.genesisHash))

  const blocksDiff = vestedConfig.endBlock - vestedConfig.startBlock
  const vestingTime = blocksDiff * (blockTime ?? 0)

  const vestingError = useMemo(() => {
    if (!vestedConfig.on) return null
    if (!currentBlock) return undefined
    if (blocksDiff <= 0) return 'End block must be after start block.'
    if (vestedConfig.startBlock < currentBlock + 1) return 'Start block is in the past.'
    if (vestedConfig.endBlock < vestedConfig.startBlock) return 'End block must be after start block.'
    return null
  }, [blocksDiff, currentBlock, vestedConfig.endBlock, vestedConfig.on, vestedConfig.startBlock])

  return (
    <>
      <NewTransactionHeader icon={<Send />} title="Send">
        {vestingSupported ? (
          <div className="flex items-center gap-[8px]">
            <label htmlFor="vested" className="text-right mt-[3px]">
              Vested
            </label>
            <Switch
              id="vested"
              checked={vestedConfig.on}
              onCheckedChange={() => onChangeVestedConfig({ ...vestedConfig, on: !vestedConfig.on })}
            />
          </div>
        ) : vestingSupported === undefined ? (
          <Skeleton.Surface className="w-[80px] h-[24px]" />
        ) : null}
      </NewTransactionHeader>
      <div className="grid gap-[24px] mt-[32px]">
        {vestedConfig.on && (
          <div>
            <div className="flex items-center gap-[12px] flex-col sm:flex-row">
              <BlockInput
                blockTime={blockTime}
                currentBlock={currentBlock}
                label={byDate => (byDate ? 'Start Date' : 'Start Block')}
                onChange={blockNumber => onChangeVestedConfig({ ...vestedConfig, startBlock: blockNumber })}
                value={vestedConfig.startBlock}
                minBlock={currentBlock === undefined ? undefined : currentBlock + 1}
              />
              <BlockInput
                blockTime={blockTime}
                currentBlock={currentBlock}
                label={byDate => (byDate ? 'End Date' : 'End Block')}
                onChange={blockNumber => onChangeVestedConfig({ ...vestedConfig, endBlock: blockNumber })}
                value={vestedConfig.endBlock}
                minBlock={currentBlock ? Math.max(vestedConfig.startBlock, currentBlock ?? 0) + 1 : undefined}
              />
            </div>
            {!!vestingError ? (
              <p className="mt-[4px] text-[14px] text-red-400">{vestingError}</p>
            ) : blocksDiff > 0 ? (
              <p className="mt-[4px] text-[14px]">
                The transfer would be vested in{' '}
                <span className="text-offWhite">&asymp;{secondsToDuration(vestingTime)}</span>
              </p>
            ) : null}
          </div>
        )}
        <div className="text-offWhite w-full">
          <AmountFlexibleInput
            tokens={tokens}
            selectedToken={selectedToken}
            setSelectedToken={setSelectedToken}
            setAmount={setAmount}
            amountPerBlockBn={amountPerBlockBn}
          />
        </div>
        <div className="text-offWhite">
          <AddressInput onChange={setDestinationAddress} addresses={addresses} leadingLabel="Recipient" chain={chain} />
        </div>
        <div className="text-offWhite">
          <Input
            label="Transaction Description"
            placeholder='e.g. "Reimburse transaction fees"'
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        {hasNonDelayedPermission === false ? (
          hasDelayedPermission ? (
            <Alert>
              <p>Time delayed proxies are not supported yet.</p>
            </Alert>
          ) : (
            <Alert>
              <p>
                Your Multisig does not have the proxy permission required to send token on behalf of the proxied
                account.
              </p>
            </Alert>
          )
        ) : (
          <Button
            className="w-max"
            loading={loading || vestingConsts.state === 'loading'}
            disabled={
              loading ||
              !destinationAddress ||
              isNaN(parseFloat(amount)) ||
              amount.endsWith('.') ||
              !selectedToken ||
              !name ||
              !hasNonDelayedPermission ||
              vestingError !== null
            }
            onClick={onNext}
            children="Review"
          />
        )}
      </div>
    </>
  )
}
