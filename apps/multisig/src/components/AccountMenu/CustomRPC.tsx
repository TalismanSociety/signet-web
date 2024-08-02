import { ChainPill } from '@components/ChainPill'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { supportedChains } from '@domains/chains'
import { customPjsApiSelector, customRpcsAtom, useApi } from '@domains/chains/pjs-api'
import { useDebounce } from '@hooks/useDebounce'
import { CircularProgressIndicator } from '@talismn/ui'
import { Check, ChevronLeft, Info, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValueLoadable } from 'recoil'

const CustomRPCForm: React.FC<{ genesisHash: string; onBack: () => void }> = ({ genesisHash, onBack }) => {
  const [customRpcs, setCustomRpcs] = useRecoilState(customRpcsAtom)
  const currentCustom = customRpcs[genesisHash]
  const [rpcUrl, setRpcUrl] = useState(currentCustom || '')
  const { api } = useApi(genesisHash)
  const [validated, setValidated] = useState(false)

  const selectedNetwork = useMemo(() => {
    return supportedChains.find(chain => chain.genesisHash === genesisHash)
  }, [genesisHash])

  const debouncedRpcUrl = useDebounce(rpcUrl, 500)
  const apiLoadable = useRecoilValueLoadable(customPjsApiSelector(debouncedRpcUrl))

  useEffect(() => {
    if (apiLoadable.state === 'hasValue' || apiLoadable.state === 'hasError') setValidated(true)
  }, [apiLoadable])

  const isSameChain = useMemo(() => {
    if (!api) return undefined // we dont knpw, current api could be down
    if (apiLoadable.state !== 'hasValue') return undefined
    return api.genesisHash.eq(apiLoadable.contents.genesisHash)
  }, [api, apiLoadable])

  const handleSave = useCallback(() => {
    const useDefault = currentCustom && currentCustom === rpcUrl
    if (useDefault) setRpcUrl('')
    setCustomRpcs(prev => ({
      ...prev,
      [genesisHash]: useDefault ? undefined : debouncedRpcUrl,
    }))
    window.location.reload()
  }, [currentCustom, debouncedRpcUrl, genesisHash, rpcUrl, setCustomRpcs])

  if (!selectedNetwork) return null

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between ">
        <Button size="icon" className="items-center" variant="ghost" onClick={onBack}>
          <ChevronLeft size={14} />
        </Button>
        <div className="flex items-center gap-[4px]">
          <img src={selectedNetwork.logo} alt={selectedNetwork.chainName} className="w-[18px] h-[18px] rounded-[8px]" />
          <h4 className="text-[14px] font-semibold mt-[3px]">{selectedNetwork.chainName}</h4>
        </div>
        <div className="w-[30px]" />
      </div>
      <div className="p-[8px]">
        <p className="text-[14px] text-gray-200 mb-[4px]">Enter a custom RPC url.</p>
        <Input
          placeholder="e.g. wss://apps-rpc.polkadot.io"
          className="text-[14px] h-max min-h-max px-[12px] py-[8px] rounded-[8px]"
          value={rpcUrl}
          onChange={e => {
            setRpcUrl(e.target.value)
            setValidated(false)
          }}
          suffix={
            apiLoadable.state === 'loading' ? (
              <CircularProgressIndicator size={16} />
            ) : apiLoadable.state === 'hasValue' ? (
              isSameChain === false ? (
                <Info size={16} className="text-orange-400 rotate-180" />
              ) : (
                <Check size={16} className="text-green-400" />
              )
            ) : debouncedRpcUrl.length > 0 ? (
              <X size={16} className="text-red-500" />
            ) : null
          }
        />
        {validated && debouncedRpcUrl.length > 0 && apiLoadable.state === 'hasError' && (
          <p className="text-[12px] text-red-400 mt-[4px]">{(apiLoadable.contents as Error).message}</p>
        )}
        {isSameChain === false && (
          <p className="text-[12px] text-red-400 mt-[4px]">
            Genesis hash mismatch! Using a wrong custom RPC may result in unexpected behaviour.
          </p>
        )}

        <Button
          size="lg"
          className="w-full mt-[8px] py-[8px] h-max max-h-max"
          variant={isSameChain === false ? 'destructive' : 'default'}
          disabled={
            currentCustom && currentCustom === rpcUrl
              ? false
              : !validated || currentCustom === rpcUrl || apiLoadable.state !== 'hasValue'
          }
          onClick={handleSave}
        >
          {currentCustom === rpcUrl ? 'Use Default' : isSameChain === false ? 'Use Anyway' : 'Save RPC'}
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
        <h4 className="text-[14px] font-semibold mt-[3px]">Custom RPC</h4>
        <div className="w-[30px]" />
      </div>
      <div className="max-h-[160px] overflow-y-auto flex flex-col overflow-x-hidden">
        {supportedChains.map(network => (
          <Button
            key={network.id}
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
