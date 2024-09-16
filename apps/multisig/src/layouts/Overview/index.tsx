import { useSelectedMultisig } from '@domains/multisig'
import { DUMMY_MULTISIG_ID } from '@util/constants'
import { getAllChangeAttempts } from '@domains/offchain-data/metadata'
import { toMultisigAddress } from '@util/addresses'
import { useCallback, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'

import Assets from './Assets'
import Transactions from './Transactions'
import { useUpdateMultisigConfig } from '../../domains/offchain-data'
import { selectedAccountState } from '../../domains/auth'
import VaultOverview from './VaultOverview'
import { useToast } from '../../components/ui/use-toast'
import { ToastAction } from '@components/ui/toast'
import { useNavigate } from 'react-router-dom'

const Overview = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const signedInAccount = useRecoilValue(selectedAccountState)

  const { updateMultisigConfig } = useUpdateMultisigConfig()
  const { toast, dismiss } = useToast()
  const [toastedForVault, setToastedForVault] = useState<string>()
  const navigate = useNavigate()

  useEffect(() => {
    if (selectedMultisig.id !== toastedForVault) {
      dismiss()
    }
  }, [dismiss, selectedMultisig.id, toastedForVault])

  // TODO: consider migrating to top level so it works regardless of page?
  const detectChangeAndAutoUpdate = useCallback(async () => {
    try {
      if (!selectedMultisig.proxies || !selectedMultisig.allProxies) return // loading

      if (selectedMultisig.proxies.length > 0) return // has proxies, no need to change

      console.log(
        `Detected change in multisig configuration. Outdated multisig address ${selectedMultisig.multisigAddress.toSs58(
          selectedMultisig.chain
        )}, current delegatees: ${selectedMultisig.allProxies.map(d => d.delegate.toSs58(selectedMultisig.chain))}`
      )
      /**
       * Edge case that may break this:
       * - Multisig A: stash + multisig[1,2,3]
       * - Multisig B: stash + multisig[1,2,3,4]
       * - both sets of signers formed multisigs are delegatees of a stash (different department of an org)
       * - Multisig A adds signer 4, multisig[1,2,3,4] now has 2 relationships to the same stash
       * - Multisig B removes signer 4 and add signer 5, but change did not get save, so Multisig B's config is still stuck at multisig[1,2,3,4] when it should be multisig[1,2,3,5]
       * - logic below will not get triggered because Multisig B's config is still valid
       * - solution should be to have a settings page where they can manually resolve the change
       */
      const allChangeAttempts = await getAllChangeAttempts(selectedMultisig, signedInAccount)
      for (const changeAttempt of allChangeAttempts) {
        const changeMultisigAddress = toMultisigAddress(changeAttempt.newMembers, changeAttempt.newThreshold)
        if (selectedMultisig.allProxies.some(({ delegate }) => delegate.isEqual(changeMultisigAddress))) {
          const newMultisig = {
            ...selectedMultisig,
            multisigAddress: changeMultisigAddress,
            threshold: changeAttempt.newThreshold,
            signers: changeAttempt.newMembers,
          }

          await updateMultisigConfig(newMultisig)
          toast({
            title: 'Vault Config Updated',
            description: 'An update in multisig configuration was detected and automatically applied.',
            duration: 5000,
          })
          return
        }
      }
    } catch (error) {
      console.error('Failed to fetch new multisig configuration from metadata service:', error)
    }

    setToastedForVault(selectedMultisig.id)
    toast({
      title: `Proxy not detected for ${selectedMultisig.name}! `,
      description: (
        <div>
          <p className="text-[12px]">Please reconfigure the multisig settings to continue using the multisig</p>
        </div>
      ),
      duration: 600000,
      action: (
        <ToastAction
          altText="Go to Settings"
          onClick={() => {
            dismiss()
            navigate('/settings')
          }}
        >
          Go to Settings
        </ToastAction>
      ),
    })
  }, [dismiss, navigate, selectedMultisig, signedInAccount, toast, updateMultisigConfig])

  useEffect(() => {
    // DUMMY MULTISIG, dont need to detect or check for changes
    if (selectedMultisig.id === DUMMY_MULTISIG_ID) return

    detectChangeAndAutoUpdate()
  }, [detectChangeAndAutoUpdate, selectedMultisig.id, selectedMultisig.proxies])

  return (
    <div className="flex flex-col lg:flex-row gap-[16px] flex-1 w-[100px]">
      <div
        className="flex flex-col gap-[16px] h-full w-full flex-1 lg:w-[100px] lg:flex-[7]"
        css={{ gridArea: 'overview-assets' }}
      >
        <VaultOverview />
        <Assets />
      </div>
      <Transactions />
    </div>
  )
}

export default Overview
