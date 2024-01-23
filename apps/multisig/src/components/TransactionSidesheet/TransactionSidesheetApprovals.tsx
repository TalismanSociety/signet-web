import MemberRow from '@components/MemberRow'
import StatusCircle, { StatusCircleType } from '@components/StatusCircle'
import { Tooltip } from '@components/ui/tooltip'
import { Transaction } from '@domains/multisig'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Address } from '@util/addresses'

export const TransactionSidesheetApprovals: React.FC<{ t: Transaction }> = ({ t }) => {
  const { contactByAddress } = useKnownAddresses(t.multisig.id)
  return (
    <div css={{ display: 'grid', gap: '14px' }}>
      {Object.entries(t.approvals).map(([encodedAddress, approval]) => {
        const decodedAddress = Address.fromPubKey(encodedAddress)
        if (!decodedAddress) {
          console.error(`Could not decode address in t.approvals!`)
          return null
        }
        const contact = contactByAddress[decodedAddress.toSs58()]
        return (
          <div key={encodedAddress} css={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <div css={{ width: '100%' }}>
              <MemberRow
                member={{ address: decodedAddress, nickname: contact?.name, you: contact?.extensionName !== undefined }}
                chain={t.multisig.chain}
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
