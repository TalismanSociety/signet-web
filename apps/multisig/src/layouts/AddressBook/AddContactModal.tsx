import { useMemo, useState } from 'react'
import { Button, TextInput } from '@talismn/ui'
import Modal from '@components/Modal'
import { useInput } from '@hooks/useInput'
import { Address } from '@util/addresses'
import { useAddressBook, useCreateContact } from '../../domains/offchain-data'
import { useSelectedMultisig } from '../../domains/multisig'
import { azeroResolverToAddress } from '@util/azeroid'

type Props = {
  onClose?: () => void
  isOpen?: boolean
}

export const AddContactModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const addressInput = useInput('')
  const nameInput = useInput('')
  const { createContact, creating } = useCreateContact()
  const [selectedMultisig] = useSelectedMultisig()
  const { contactsByAddress } = useAddressBook()

  const handleClose = () => {
    if (creating) return
    nameInput.onChange('')
    addressInput.onChange('')
    onClose?.()
  }

  const parsedAZEROID = useMemo(() => {
    try {
      if (addressInput.value.includes('.azero')) return addressInput.value
      return false
    } catch (e) {
      return false
    }
  }, [addressInput.value])

  // const parsedAZEROID = useMemo(async() => {
  //   try {
  //     if (addressInput.value.includes(".azero") || addressInput.value.includes(".tzero")) {
  //       const resolvedAddress = await azeroResolverToAddress(addressInput.value)
  //       if (resolvedAddress) {
  //         return Address.fromSs58(resolvedAddress);
  //       } else {
  //         console.error("AZERO ID Does not exist!")
  //         return
  //       }
  //     }
  //     return false
  //   } catch (e) {
  //     return false
  //   }
  // }, [addressInput.value])

  // console.log("parsedAZEROID:: ", parsedAZEROID)

  const parsedAddress = useMemo(() => {
    try {
      return Address.fromSs58(addressInput.value)
    } catch (e) {
      return false
    }
  }, [addressInput.value])

  // const handleCreateContact = async () => {
  //   if (!parsedAddress || !parsedAZEROID) return
  //   let resultingAddress: Address;
  //   if (parsedAddress) {resultingAddress = parsedAddress}
  //   else if (parsedAZEROID) {
  //     const resolvedAddress = await azeroResolverToAddress(parsedAZEROID)
  //     if (typeof resolvedAddress === 'string') {
  //       const addressFromSs58 = Address.fromSs58(resolvedAddress);
  //       if (addressFromSs58) {resultingAddress = addressFromSs58}
  //       else return
  //     } else {
  //       console.error("AZERO ID Does not exist!")
  //       return
  //     }
  //   }
  //   const created = await createContact(resultingAddress, nameInput.value, selectedMultisig.id)
  //   if (created) handleClose()
  // }

  const handleCreateContact = async () => {
    if (parsedAddress) {
      const created = await createContact(parsedAddress, nameInput.value, selectedMultisig.id)
      if (created) handleClose()
    } else if (parsedAZEROID) {
      const resolvedAddress = await azeroResolverToAddress(parsedAZEROID)
      if (resolvedAddress) {
        const addressFromSs58 = Address.fromSs58(resolvedAddress)
        if (addressFromSs58) {
          const created = await createContact(addressFromSs58, nameInput.value, selectedMultisig.id)
          if (created) handleClose()
        } else {
          console.error('No Address found for AZERO ID')
          return
        }
      } else {
        console.error('AZERO ID Does not exist!')
        return
      }
    } else {
      return
    }
  }

  const disabled = !(parsedAddress || parsedAZEROID) || !nameInput.value
  const conflict = parsedAddress ? !!contactsByAddress[parsedAddress.toSs58()] : false
  const isAzeroId = !parsedAZEROID ? true : false

  // refactor to use this so that it can account for existing created Addresses
  // const parsedAddress = useMemo(async() => {
  //   try {
  //     if (addressInput.value.includes(".azero") || addressInput.value.includes(".tzero")) {
  //       const resolvedAddress = await azeroResolverToAddress(addressInput.value)
  //       if (resolvedAddress) {
  //         return Address.fromSs58(resolvedAddress);
  //       } else {
  //         console.error("AZERO ID Does not exist!")
  //         return false
  //       }
  //     }
  //     return Address.fromSs58(addressInput.value)
  //   } catch (e) {
  //     return false
  //   }
  // }, [addressInput.value])

  // const handleCreateContact = async () => {
  //   const resultingAddress = await parsedAddress
  //   if (!(resultingAddress)) return
  //   const created = await createContact(resultingAddress, nameInput.value, selectedMultisig.id)
  //   if (created) handleClose()
  // }

  // const disabled = !parsedAddress || !nameInput.value
  // const conflict = parsedAddress ? !!contactsByAddress[parsedAddress.toSs58()] : false

  // console.log("isAzeroId: ", isAzeroId)
  // console.log("conflict: ", conflict)
  // console.log("disabled: ", disabled)
  // console.log("creating: ", creating)
  return (
    <Modal isOpen={isOpen ?? false} width="100%" maxWidth={420} contentLabel="Add new contact">
      <h1 css={{ fontSize: 20, fontWeight: 700 }}>Add new contact</h1>
      <p css={{ marginTop: 8 }}>Saved contacts will be shared by all members of your multisig.</p>
      <form css={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <TextInput placeholder="Contact Name" leadingLabel="Name" {...nameInput} />
        <TextInput
          placeholder="Address"
          leadingLabel="Address"
          {...addressInput}
          leadingSupportingText={
            conflict ? (
              <p
                css={({ color }) => ({
                  color: color.lightGrey,
                  fontSize: 14,
                  marginLeft: 12,
                })}
              >
                Address already exists in address book.
              </p>
            ) : null
          }
        />
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
          <Button type="button" variant="outlined" css={{ width: '100%' }} onClick={handleClose}>
            <p>Cancel</p>
          </Button>
          <Button
            css={{ width: '100%' }}
            disabled={disabled || creating || conflict || isAzeroId}
            loading={creating}
            onClick={handleCreateContact}
          >
            <p>Save</p>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
