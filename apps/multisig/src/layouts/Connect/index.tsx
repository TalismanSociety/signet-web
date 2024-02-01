import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { Multisig, activeMultisigsState } from '@domains/multisig'
import { Identicon } from '@talismn/ui'
import { Button } from '@components/ui/button'
import { Checkbox } from '@components/ui/checkbox'
import { Layout } from '../Layout'

/** Signet Conenct is not the actual feature name (yet), just trying to make it cool :) */
export const SignetConnect: React.FC = () => {
  const navigate = useNavigate()
  const activeMultisigs = useRecoilValue(activeMultisigsState)
  const [selectedVaultIds, setSelectedVaultIds] = useState<Record<string, boolean>>({})

  const selectedVaults = useMemo(
    () =>
      Object.keys(selectedVaultIds)
        .filter(id => selectedVaultIds[id])
        .map(id => activeMultisigs.find(m => m.id === id))
        .filter(multisig => !!multisig) as Multisig[],
    [activeMultisigs, selectedVaultIds]
  )

  const handleCancel = () => {
    if (window.opener) {
      window.opener.postMessage({ type: 'signet(connect.cancel)' }, '*')
    }
    // wait for opener to do something before we perform default behavior
    setTimeout(() => {
      navigate('/')
    }, 1000)
  }

  const handleSelectAll = () => {
    if (selectedVaults.length === activeMultisigs.length) {
      setSelectedVaultIds({})
      return
    }
    setSelectedVaultIds(
      activeMultisigs.reduce((acc, multisig) => {
        acc[multisig.id] = true
        return acc
      }, {} as Record<string, boolean>)
    )
  }

  const handleContinue = () => {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'signet(connect.continue)',
          vaults: selectedVaults.map(vault => ({
            address: vault.proxyAddress.toSs58(vault.chain),
            name: vault.name,
            chain: {
              squidIds: vault.chain.squidIds,
              chainName: vault.chain.chainName,
              logo: vault.chain.logo,
              genesisHash: vault.chain.genesisHash,
              isTestnet: vault.chain.isTestnet,
            },
          })),
        },
        '*'
      )
    }
    // wait for opener to do something before we perform default behavior
    setTimeout(() => {
      navigate('/')
    }, 1000)
  }

  // auto select if only 1 vault is available for connection
  useEffect(() => {
    if (Object.keys(selectedVaultIds).length === 0 && activeMultisigs.length === 1) {
      setSelectedVaultIds({ [activeMultisigs[0]!.id]: true })
    }
  }, [activeMultisigs, selectedVaultIds])

  return (
    <Layout hideSideBar requiresMultisig>
      {window.opener ? (
        <div className="max-w-[863px] mx-auto my-[64px] rounded-[24px] bg-gray-900 px-[16px] py-[24px] sm:py-[80px] w-full">
          <h1 className=" text-[32px] text-center">Connect Vaults</h1>
          <div className="w-full max-w-[450px] mx-auto my-[24px] grid gap-[12px]">
            <p className="hover:text-primary ml-auto pr-[8px] cursor-pointer text-[14px]" onClick={handleSelectAll}>
              {selectedVaults.length === activeMultisigs.length ? 'Remove All' : 'Select All'}
            </p>
            {activeMultisigs.map(multisig => (
              <div
                className="flex items-center justify-between bg-gray-800 hover:bg-gray-800/80 p-[16px] rounded-[12px]"
                key={multisig.id}
                onClick={() => {
                  setSelectedVaultIds(prev => ({
                    ...prev,
                    [multisig.id]: !prev[multisig.id],
                  }))
                }}
              >
                <div className="flex items-center gap-[8px]">
                  <div className="relative">
                    <img
                      css={{ top: -2, right: -2, position: 'absolute', height: 14 }}
                      src={multisig.chain.logo}
                      alt={multisig.chain.chainName}
                    />
                    <Identicon value={multisig.proxyAddress.toSs58(multisig.chain)} size={32} />
                  </div>
                  <div>
                    <p className="text-offWhite">{multisig.name}</p>
                    <p>{multisig.proxyAddress.toShortSs58(multisig.chain)}</p>
                  </div>
                </div>
                <Checkbox id={multisig.id} checked={selectedVaultIds[multisig.id] ?? false} />
              </div>
            ))}
          </div>
          <div className="flex items-center w-max mx-auto gap-[16px]">
            <Button variant="outline" className="w-max" onClick={handleCancel}>
              Cancel
            </Button>
            <Button disabled={selectedVaults.length === 0} className="w-max" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </div>
      ) : (
        // Connect page must be opened by another window, like Talisman Extension
        <Navigate to="/" replace />
      )}
    </Layout>
  )
}
