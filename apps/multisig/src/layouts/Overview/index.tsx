import { useAugmentedBalances } from '@domains/balances'
import { DUMMY_MULTISIG_ID, useSelectedMultisig } from '@domains/multisig'
import { getAllChangeAttempts } from '@domains/offchain-data/metadata'
import { toMultisigAddress } from '@util/addresses'
import { useCallback, useEffect } from 'react'
import { useRecoilValue } from 'recoil'

import Assets, { TokenAugmented } from './Assets'
import Transactions from './Transactions'
import { Layout } from '../Layout'
import { useUpdateMultisigConfig } from '../../domains/offchain-data'
import { selectedAccountState } from '../../domains/auth'
import VaultOverview from './VaultOverview'
import { useToast } from '../../components/ui/use-toast'

const Overview = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const signedInAccount = useRecoilValue(selectedAccountState)
  const { updateMultisigConfig } = useUpdateMultisigConfig()
  const { toast } = useToast()

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
       * - Vault A: stash + multisig[1,2,3]
       * - Vault B: stash + multisig[1,2,3,4]
       * - both sets of signers formed multisigs are delegatees of a stash (different department of an org)
       * - Vault A adds signer 4, multisig[1,2,3,4] now has 2 relationships to the same stash
       * - Vault B removes signer 4 and add signer 5, but change did not get save, so Vault B's config is still stuck at multisig[1,2,3,4] when it should be multisig[1,2,3,5]
       * - logic below will not get triggered because Vault B's config is still valid
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

          await updateMultisigConfig(newMultisig, signedInAccount)
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

    toast({
      title: `Proxy not detected for ${selectedMultisig.name}! `,
      description: (
        <div>
          <p className="text-[12px]">
            1. Make sure configuration for <span className="font-bold">{selectedMultisig.name}</span> is up-to-date.
          </p>
          <p className="text-[12px]">2. Check that the RPC is working.</p>
          <p className="text-[12px]">3. Refresh the page and check if the issue still persist.</p>
          <p className="text-[12px] mt-[8px]">
            If you think this is a bug, report to Signet at{' '}
            <a
              className="underline"
              href={`mailto:${process.env.REACT_APP_CONTACT_EMAIL}`}
              target="_blank"
              rel="noreferrer"
            >
              {process.env.REACT_APP_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      ),
      duration: 600000,
    })
  }, [selectedMultisig, signedInAccount, toast, updateMultisigConfig])

  useEffect(() => {
    // DUMMY MULTISIG, dont need to detect or check for changes
    if (selectedMultisig.id === DUMMY_MULTISIG_ID) return

    detectChangeAndAutoUpdate()
  }, [detectChangeAndAutoUpdate, selectedMultisig.id, selectedMultisig.proxies])

  const augmentedTokens: TokenAugmented[] = useAugmentedBalances()
  return (
    <Layout selected="Overview" requiresMultisig>
      <div className="flex flex-col lg:flex-row gap-[16px] flex-1 w-[100px]">
        <div
          className="flex flex-col gap-[16px] h-full w-full flex-1 lg:w-[100px] lg:flex-[5]"
          css={{ gridArea: 'overview-assets' }}
        >
          <VaultOverview />
          <Assets augmentedTokens={augmentedTokens} />
        </div>
        <Transactions />
      </div>
    </Layout>
  )
}

export default Overview
