import { useState, useMemo } from 'react'
import { Button } from '@components/ui/button'
import Modal from '@components/Modal'
import { useInput } from '@hooks/useInput'
import { Address } from '@util/addresses'
import { useSelectedMultisig } from '../../domains/multisig'
import { Input } from '@components/ui/input'
import AddressInput from '@components/AddressInput'
import useUpsertAddresses from '@domains/offchain-data/address-book/hooks/useUpsertAddresses'
import { useGetInfiniteCategories } from '@domains/offchain-data/address-book/hooks/useGetInfiniteCategories'
import { useGetInfiniteSubcategories } from '@domains/offchain-data/address-book/hooks/useGetInfiniteSubcategories'
import CreatableDropdown from '@components/DropdownSearchable'
import { useDebounce } from '@hooks/useDebounce'
import { useKnownAddresses } from '@hooks/useKnownAddresses'

type Props = {
  onClose?: () => void
  isOpen?: boolean
  isPaidPlan: boolean
}

type SelectedOption = {
  id: string
  name: string
}

const DEFAULT_SELECTED_OPTION: SelectedOption = { id: '', name: '' }

export const AddContactModal: React.FC<Props> = ({ isOpen, onClose, isPaidPlan }) => {
  const nameInput = useInput('')
  const [address, setAddress] = useState<Address>()
  const [selectedCategory, setSelectedCategory] = useState<SelectedOption>(DEFAULT_SELECTED_OPTION)
  const [selectedSubcategory, setSelectedSubcategory] = useState<SelectedOption>(DEFAULT_SELECTED_OPTION)
  const [selectedMultisig] = useSelectedMultisig()
  const { contactByAddress, isLoading: isKnownAddressLoading } = useKnownAddresses({
    addresses: [address?.toSs58() || ''],
  })

  const debouncedCategorySearch = useDebounce(selectedCategory.name, 300)
  const debouncedSubcategorySearch = useDebounce(selectedSubcategory.name, 300)

  const {
    data: categoriesData,
    hasNextPage: hasCategoriesNextPage,
    fetchNextPage: categoriesFetchNextPage,
    isFetching: isCategoriesFetching,
  } = useGetInfiniteCategories(debouncedCategorySearch)

  const {
    data: subCategoriesData,
    hasNextPage: hasSubcategoriesNextPage,
    fetchNextPage: subCategoriesFetchNextPage,
    isFetching: isSubcategoriesFetching,
  } = useGetInfiniteSubcategories({ categoryId: selectedCategory.id, search: debouncedSubcategorySearch })

  const handleClose = () => {
    nameInput.onChange('')
    setSelectedCategory(DEFAULT_SELECTED_OPTION)
    setAddress(undefined)
    onClose?.()
  }

  const { mutate, isPending } = useUpsertAddresses(handleClose)

  const handleCreateContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address) return
    const contact = {
      id: '',
      name: nameInput.value,
      address: address.toSs58(),
      org_id: selectedMultisig.orgId,
      team_id: selectedMultisig.id,
      category: { id: selectedCategory.id, name: selectedCategory.name },
      sub_category: { id: selectedSubcategory.id, name: selectedSubcategory.name },
    }
    mutate([contact])
  }

  const disabled = !address || !nameInput.value
  const conflict = useMemo(() => {
    if (isKnownAddressLoading) return true
    if (!address || isPaidPlan) return false
    return !!contactByAddress[address.toSs58()]
  }, [address, contactByAddress, isPaidPlan, isKnownAddressLoading])

  return (
    <Modal isOpen={isOpen ?? false} width="100%" maxWidth={420} contentLabel="Add new contact">
      <h1 css={{ fontSize: 20, fontWeight: 700 }}>Add new contact</h1>
      <p css={{ marginTop: 8 }}>Saved contacts will be shared by all members of your multisig.</p>
      <form
        css={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}
        onSubmit={e => handleCreateContact(e)}
      >
        <Input placeholder="Contact Name" label="Name" {...nameInput} />
        <div className="w-full">
          <AddressInput
            leadingLabel="Address"
            onChange={newAddress => setAddress(newAddress)}
            chain={selectedMultisig.chain}
            shouldExcludeExtensionContacts
          />
          {conflict ? (
            <p className="text-gray-200 mt-[8px] ml-[12px] text-[14px]">Address already exists in address book.</p>
          ) : null}
        </div>

        {isPaidPlan && (
          <>
            <div>
              <div className="text-[14px]">Category</div>
              <CreatableDropdown<SelectedOption>
                options={categoriesData || []}
                selectedOption={selectedCategory}
                onSelect={setSelectedCategory}
                onClear={() => {
                  setSelectedCategory(DEFAULT_SELECTED_OPTION)
                  setSelectedSubcategory(DEFAULT_SELECTED_OPTION)
                }}
                onSearch={(search: string) => {
                  setSelectedCategory({ id: '', name: search })
                  setSelectedSubcategory(DEFAULT_SELECTED_OPTION)
                }}
                fetchMoreOptions={categoriesFetchNextPage}
                hasMore={hasCategoriesNextPage}
                isLoading={isCategoriesFetching}
                displayKey={'name'}
              />
            </div>
            <div>
              <div className="text-[14px]">Subcategory</div>
              <CreatableDropdown<SelectedOption>
                options={subCategoriesData || []}
                selectedOption={selectedSubcategory}
                onSelect={setSelectedSubcategory}
                onClear={() => setSelectedSubcategory(DEFAULT_SELECTED_OPTION)}
                onSearch={(search: string) => setSelectedSubcategory({ id: '', name: search })}
                fetchMoreOptions={subCategoriesFetchNextPage}
                hasMore={hasSubcategoriesNextPage}
                isLoading={isSubcategoriesFetching}
                displayKey={'name'}
                isDisabled={!selectedCategory.name}
              />
            </div>
          </>
        )}

        <div
          css={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            button: {
              height: 56,
              p: { marginTop: 4 },
            },
          }}
        >
          <Button type="button" variant="outline" css={{ width: '100%' }} onClick={handleClose}>
            <p>Cancel</p>
          </Button>
          <Button
            css={{ width: '100%' }}
            disabled={disabled || isPending || conflict || isKnownAddressLoading}
            loading={isPending}
          >
            <p>Save</p>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
