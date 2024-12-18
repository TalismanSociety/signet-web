import MemberRow from '@components/MemberRow'
import StatusCircle, { StatusCircleType } from '@components/StatusCircle'
import { Tooltip } from '@components/ui/tooltip'
import { Transaction } from '@domains/offchain-data/metadata/types'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Address } from '@util/addresses'
import { useSelectedMultisig } from '@domains/multisig'

export const TransactionSidesheetApprovals: React.FC<{ t: Transaction }> = ({ t }) => {
  const [{ isEthereumAccount }] = useSelectedMultisig()
  const approversAddresses = Object.keys(t.approvals).reduce<string[]>((acc, address) => {
    const decodedAddress = isEthereumAccount ? Address.fromSs58(address) : Address.fromPubKey(address)
    if (decodedAddress) {
      acc.push(decodedAddress.toSs58())
    }
    return acc
  }, [])

  const { contactByAddress, isLoading } = useKnownAddresses({ addresses: approversAddresses })
  return (
    <div css={{ display: 'grid', gap: '14px' }}>
      {Object.entries(t.approvals).map(([address, approval]) => {
        const decodedAddress = isEthereumAccount ? Address.fromSs58(address) : Address.fromPubKey(address)
        if (!decodedAddress) {
          console.error(`Could not decode address in t.approvals!`)
          return null
        }
        const contact = contactByAddress[decodedAddress.toSs58()]
        return (
          <div key={address} css={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <div css={{ width: '100%' }}>
              <MemberRow
                member={{ address: decodedAddress, nickname: contact?.name, you: contact?.extensionName !== undefined }}
                chain={t.multisig.chain}
                isNameLoading={isLoading}
              />
            </div>
            {(t.rawPending || t.executedAt) && (
              <div className="ml-[24px]">
                <Tooltip content={approval ? 'Approved' : 'Waiting for approval'}>
                  <div>
                    <StatusCircle
                      type={approval ? StatusCircleType.Success : StatusCircleType.PendingApproval}
                      circleDiameter="24px"
                      iconDimentions={{ width: '11px', height: 'auto' }}
                    />
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
