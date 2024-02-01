import { InjectedAccount } from '@domains/extension'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronVertical, Search } from '@talismn/icons'
import { useOnClickOutside } from '../../domains/common/useOnClickOutside'
import { AccountDetails } from '@components/AddressInput/AccountDetails'

type Props = {
  accounts: InjectedAccount[]
  selectedAccount?: InjectedAccount
  onSelect?: (account: InjectedAccount) => void
}

const AccountComboBox: React.FC<Props> = ({ accounts, onSelect, selectedAccount }) => {
  const [expanded, setExpanded] = useState(false)
  const ref = useRef(null)
  const [query, setQuery] = useState('')
  useOnClickOutside(ref.current, () => setExpanded(false))

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const isSelectedAccount = selectedAccount?.address.isEqual(acc.address)
      const isQueryMatch =
        !query || `${acc.meta.name} ${acc.address.toSs58()}`.toLowerCase().includes(query.toLowerCase())
      return !isSelectedAccount && isQueryMatch
    })
  }, [query, accounts, selectedAccount])

  useEffect(() => {
    if (!expanded && query.length > 0) setQuery('')
  }, [expanded, query.length])

  useEffect(() => {
    if (!selectedAccount) return

    // selected account is disconnected from extension
    if (!accounts.find(acc => acc.address.isEqual(selectedAccount?.address)) && accounts[0]) {
      onSelect?.(accounts[0])
    }
  }, [accounts, onSelect, selectedAccount])

  if (!selectedAccount) return null

  return (
    <div ref={ref} css={{ position: 'relative', width: '100%' }}>
      <div
        css={({ color }) => ({
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          background: color.foreground,
          borderRadius: 8,
          border: `solid 1px ${expanded ? color.border : 'rgba(0,0,0,0)'}`,
          borderBottom: 'none',
          width: '100%',
          padding: '16px 24px',
          ...(accounts.length > 1
            ? {
                'cursor': 'pointer',
                ':hover': {
                  div: { color: color.offWhite },
                },
              }
            : {}),
        })}
        onClick={() => setExpanded(!expanded)}
      >
        <AccountDetails
          address={selectedAccount.address}
          name={selectedAccount.meta.name}
          disableCopy
          withAddressTooltip
        />
        <div
          css={({ color }) => ({
            height: 'max-content',
            lineHeight: 1,
            visibility: accounts.length > 1 ? 'visible' : 'hidden',
            color: expanded ? color.offWhite : color.lightGrey,
          })}
        >
          <ChevronVertical size={24} />
        </div>
      </div>
      {accounts.length > 1 && (
        <div
          css={({ color }) => ({
            position: 'absolute',
            top: '100%',
            // to cover the transition of bottom border radius
            marginTop: -8,
            paddingTop: 8,
            left: 0,
            backgroundColor: color.foreground,
            borderRadius: '0px 0px 4px 4px',
            border: `solid 1px ${expanded ? color.border : 'rgba(0,0,0,0)'}`,
            visibility: expanded ? 'visible' : 'hidden',
            borderTop: 'none',
            padding: '0 24px',
            width: '100%',
            zIndex: 1,
            height: 'min-content',
            maxHeight: expanded ? 400 : 0,
            overflow: 'hidden',
            transition: '0.2s ease-in-out',
          })}
        >
          <div
            css={({ foreground }) => ({
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              borderBottom: `rgba(${foreground}, 0.1) solid 1px`,
              paddingTop: 8,
            })}
          >
            <Search />
            <input
              css={{ border: 'none', backgroundColor: 'transparent', width: '100%', padding: '16px 0px' }}
              placeholder="Search Account..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div css={{ maxHeight: 150, overflowY: 'auto', padding: '8px 0' }}>
            {filteredAccounts.map(acc => (
              <div
                css={({ color }) => ({
                  'borderRadius': 8,
                  'padding': '8px 0',
                  'cursor': 'pointer',
                  'width': '100%',
                  ':hover': {
                    div: { p: { color: color.offWhite } },
                  },
                })}
                key={acc.address.toSs58()}
                onClick={() => {
                  setExpanded(false)
                  onSelect?.(acc)
                }}
              >
                <AccountDetails address={acc.address} name={acc.meta.name} disableCopy withAddressTooltip />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountComboBox
