import { Tooltip } from '@components/ui/tooltip'
import { Database, Plus } from '@talismn/icons'
import { CONFIG } from '@lib/config'
import { Button } from '@components/ui/button'
import Logomark from '@components/Logomark'
import FileUploadButton from '@components/FileUploadButton'
import { PaginatedAddresses } from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'
import { Address } from '@util/addresses'
import { DEFAULT_PAGE_SIZE } from '..'
import { Contact } from '@domains/offchain-data'
import { useToast } from '@components/ui/use-toast'
import { Info } from 'lucide-react'

type ParsedPaginatedAddresses = PaginatedAddresses & {
  invalidRows: number[]
}

const parseCSV = async (file: File): Promise<ParsedPaginatedAddresses> => {
  let invalidRows: number[] = []
  const seenAddresses = new Set<string>()
  const text = await file.text()

  const lines = text.split('\r\n')
  const headers = lines[0]?.split(',')
  if (!headers) {
    return { rows: [], pageCount: 0, rowCount: 0, invalidRows }
  }

  const rows: Contact[] = lines.slice(1).map((line, index) => {
    const data = line.split(',')
    const name = data[headers.indexOf('Name')]
    const csvAddress = data[headers.indexOf('Address')] ?? ''
    const address = Address.fromSs58(csvAddress)

    if (!name || !address) {
      invalidRows.push(index + 1) // +1 to account for the header row
      console.log(`Invalid row: ${index + 1}, name: ${name}, address: ${address}`)
      return null as any
    }

    if (seenAddresses.has(csvAddress)) {
      invalidRows.push(index + 1) // Add the row index to invalidRows
      console.log(`Duplicate address found: ${address} at row ${index + 1}`)
      return null as any
    }

    seenAddresses.add(csvAddress)

    return {
      id: '',
      name: name,
      address: address,
      org_id: '',
      team_id: '',
      category: { id: '', name: data[headers.indexOf('Category')] },
      sub_category: { id: '', name: data[headers.indexOf('Subcategory')] },
    }
  })

  if (invalidRows.length > 0) {
    console.error(`Invalid rows: ${invalidRows.join(', ')}`)
  }

  return { rows, pageCount: Math.ceil(rows.length / DEFAULT_PAGE_SIZE), rowCount: rows.length, invalidRows }
}

const AddressBookHeader: React.FC<{
  onAddContact: () => void
  vaultName: string
  hideAddButton: boolean
  handleCsvImportSuccess: (data: PaginatedAddresses) => void
}> = ({ onAddContact, vaultName, hideAddButton, handleCsvImportSuccess }) => {
  const { toast } = useToast()
  return (
    <div className="flex flex-row items-start justify-between w-full">
      <div>
        <div className="flex items-center gap-[12px]">
          <h2 className="text-offWhite text-[24px] mt-[4px] font-bold">Address Book</h2>
          <Tooltip
            delayDuration={0}
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
      {!hideAddButton && (
        <div className="flex flex-row items-center gap-5">
          <Tooltip
            delayDuration={0}
            content={
              <div className="p-[4px] max-w-[440px]">
                <p className="text-[14px]">The CSV should have the following columns:</p>
                <ul className="[&>li>span]:text-offWhite mt-[4px] mb-[8px]">
                  <li>
                    <span>Name</span>: The name of the contact
                  </li>
                  <li>
                    <span>Address</span>: The wallet address of the contact
                  </li>
                  <li>
                    <span>Category</span> (Optional): The category of the contact
                  </li>
                  <li>
                    <span>Subcategory</span> (Optional): The subcategory of the contact
                  </li>
                </ul>
                <a
                  download="address-book-template.csv"
                  href={encodeURI(
                    `data:text/csv;filename=multisend.csvcharset=utf-8,Name,Address,Category,Subcategory\n`
                  )}
                  className="text-primary text-[14px] hover:opacity-80"
                >
                  Download CSV Template
                </a>
              </div>
            }
          >
            <Info size={16} />
          </Tooltip>
          <FileUploadButton
            accept=".csv"
            label="Import CSV"
            multiple={false}
            onFiles={async files => {
              const [file] = files
              if (!file) return

              const { invalidRows, ...parsedCsv } = await parseCSV(file)
              if (parsedCsv.rowCount > 0 && invalidRows.length === 0) {
                handleCsvImportSuccess(parsedCsv)
              } else {
                toast({
                  title: 'Invalid CSV',
                  description: `Invalid rows: ${
                    invalidRows.length > 0 ? invalidRows.map(index => index + 1).join(', ') : 'Blank rows'
                  }`, // +1 to account for the header row
                })
              }
            }}
          />
          <Button variant="outline" className="h-max py-[8px]" size="lg" onClick={onAddContact}>
            <div className="flex items-center gap-[8px]">
              <Plus size={16} />
              <p className="mt-[4px]">Add Contact</p>
            </div>
          </Button>
        </div>
      )}
    </div>
  )
}

export default AddressBookHeader
