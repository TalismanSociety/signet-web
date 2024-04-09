import { ChainPill } from '@components/ChainPill'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { supportedChains } from '@domains/chains'
import { customRpcsAtom } from '@domains/chains/pjs-api'
import { useDebounce } from '@hooks/useDebounce'
import { parseURL } from '@util/strings'
import { ChevronLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilState } from 'recoil'

const CustomRPCForm: React.FC<{ genesisHash: string; onBack: () => void }> = ({ genesisHash, onBack }) => {
  const [customRpcs, setCustomRpcs] = useRecoilState(customRpcsAtom)
  const currentCustom = customRpcs.get(genesisHash)
  const [rpcUrl, setRpcUrl] = useState(currentCustom || '')
  const [isValid, setIsValid] = useState(false)

  const selectedNetwork = useMemo(() => {
    return supportedChains.find(chain => chain.genesisHash === genesisHash)
  }, [genesisHash])

  const debouncedRpcUrl = useDebounce(rpcUrl, 500)

  const parsedRpcUrl = useMemo(() => parseURL(debouncedRpcUrl), [debouncedRpcUrl])

  const invalidRpcUrl = useMemo(() => {
    if (!parsedRpcUrl) return undefined
    if (!(parsedRpcUrl.protocol === 'ws' || parsedRpcUrl.protocol === 'wss'))
      return 'Only websocket rpcs are supported at the moment.'
    return undefined
  }, [parsedRpcUrl])

  const checkNetwork = useCallback(async () => {
    if (!parsedRpcUrl) return
  }, [parsedRpcUrl])

  useEffect(() => {
    checkNetwork()
  }, [checkNetwork])

  if (!selectedNetwork) return null

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between ">
        <Button size="icon" className="items-center" variant="ghost" onClick={onBack}>
          <ChevronLeft size={14} />
        </Button>
        <h4 className="text-[14px] font-semibold mt-[3px]">{selectedNetwork.chainName}</h4>
        <div className="w-[30px]" />
      </div>
      <div className="p-[8px]">
        <p className="text-[14px] text-gray-200 mb-[4px]">Enter a custom RPC url.</p>
        <Input
          placeholder="e.g. wss://apps-rpc.polkadot.io"
          className="text-[14px] h-max min-h-max px-[12px] py-[8px] rounded-[8px]"
          value={rpcUrl}
          onChange={e => setRpcUrl(e.target.value)}
        />
        {!!invalidRpcUrl && <p className="text-[12px] text-sm">{invalidRpcUrl}</p>}
        <Button
          size="lg"
          className="w-full mt-[8px] py-[8px] h-max max-h-max"
          disabled={currentCustom === rpcUrl || !isValid}
        >
          Save RPC
        </Button>
      </div>
    </div>
  )
}

export const CustomRPC: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedNetworkHash, setSelectedNetworkHash] = useState<string | undefined>()

  if (selectedNetworkHash) {
    return <CustomRPCForm onBack={() => setSelectedNetworkHash(undefined)} genesisHash={selectedNetworkHash} />
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between ">
        <Button size="icon" className="items-center" variant="ghost" onClick={onBack}>
          <ChevronLeft size={14} />
        </Button>
        <h4 className="text-[14px] font-semibold mt-[3px]">Custom RPCs</h4>
        <div className="w-[30px]" />
      </div>
      <div className="max-h-[160px] overflow-y-auto flex flex-col overflow-x-hidden">
        {supportedChains.map(network => (
          <Button
            key={network.squidIds.chainData}
            size="lg"
            variant="ghost"
            className="justify-start !px-[12px] py-[8px] h-max min-h-max rounded-[8px]"
            onClick={() => setSelectedNetworkHash(network.genesisHash)}
          >
            <ChainPill chain={network} />
          </Button>
        ))}
      </div>
    </div>
  )
}
