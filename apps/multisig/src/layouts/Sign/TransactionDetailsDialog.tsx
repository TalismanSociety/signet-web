import { CircularProgressIndicator } from '@talismn/ui'
import { Button } from '@components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@components/ui/dialog'
import { useDecodedCalldata } from '@domains/common'
import useCopied from '@hooks/useCopied'
import { CONFIG } from '@lib/config'

type Props = {
  callDataHex: `0x${string}`
  genesisHash?: string
  open: boolean
  onClose: () => void
}
export const TransactionDetailsDialog: React.FC<Props & React.PropsWithChildren> = ({
  callDataHex,
  children,
  genesisHash,
  onClose,
  open,
}) => {
  const { decodedCalldata, error, loading } = useDecodedCalldata(callDataHex as `0x${string}`, genesisHash || undefined)
  const { copied, copy } = useCopied()
  return (
    <Dialog
      open={open}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      modal
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl flex-1">
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogDescription asChild>
          <div className="w-full flex flex-[1] flex-col overflow-hidden gap-[16px]">
            <div className="flex items-center w-full">
              <p>
                {CONFIG.APP_NAME} uses the Dapp&apos;s call data to craft a proxy transaction that will be executed by
                the multisig of your vault.
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-[12px]">
                <CircularProgressIndicator />
                <p className="mt-[2px] opacity-70">Decoding call data...</p>
              </div>
            ) : error ? (
              <p>Could not decode call data.</p>
            ) : (
              <div className="rounded-[8px] bg-gray-800 w-full mt-[4px] overflow-auto flex flex-1">
                <div className="p-[16px] w-max">
                  <pre className="text-[14px] leading-[1.2]">{JSON.stringify(decodedCalldata, null, 2)}</pre>
                </div>
              </div>
            )}
            <Button onClick={() => copy(callDataHex, 'Copied call data!')}>
              {copied ? 'Copied!' : 'Copy Call Data'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
