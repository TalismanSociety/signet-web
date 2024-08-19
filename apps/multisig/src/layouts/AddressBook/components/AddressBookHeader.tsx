import { Tooltip } from '@talismn/ui'
import { Database, Plus } from '@talismn/icons'
import { CONFIG } from '@lib/config'
import { Button } from '@components/ui/button'
import Logomark from '@components/Logomark'

const AddressBookHeader: React.FC<{ onAddContact: () => void; vaultName: string; hideAddButton: boolean }> = ({
  onAddContact,
  vaultName,
  hideAddButton,
}) => (
  <div className="flex flex-col w-full">
    <div>
      <div className="flex items-center gap-[12px]">
        <h2 className="text-offWhite text-[24px] mt-[4px] font-bold">Address Book</h2>
        <Tooltip
          content={
            <p css={{ maxWidth: 350 }}>
              Your Address Book is currently hosted securely with Signet's Database. To find out more about Self
              Hosting, contact us at {CONFIG.CONTACT_EMAIL}
            </p>
          }
        >
          <div css={{ position: 'relative' }}>
            <Database size={20} />
            <Logomark css={{ position: 'absolute', top: 0, right: '-60%' }} size={12} />
          </div>
        </Tooltip>
      </div>
      <p>
        Share contacts securely with all signers of <span className="text-offWhite">{vaultName}</span>
      </p>
    </div>
    <div className="flex justify-end mt-[24px]">
      {!hideAddButton && (
        <Button variant="outline" className="h-max py-[8px]" size="lg" onClick={onAddContact}>
          <div className="flex items-center gap-[8px]">
            <Plus size={16} />
            <p className="mt-[4px]">Add Contact</p>
          </div>
        </Button>
      )}
    </div>
  </div>
)

export default AddressBookHeader
