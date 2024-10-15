import { Chain } from '@domains/chains'
import { AugmentedAccount } from '@domains/multisig'
import { css } from '@emotion/css'
import { ExternalLink, Trash } from '@talismn/icons'
import { AccountDetails } from '@components/AddressInput/AccountDetails'

const MemberRow = (props: {
  member: AugmentedAccount
  chain: Chain
  onDelete?: () => void
  truncate?: boolean
  isNameLoading?: boolean
}) => {
  return (
    <div
      className={css`
        align-items: center;
        display: flex;
        justify-content: space-between;
        > p {
          font-size: 16px !important;
        }
        > div {
          align-items: center;
          display: flex;
        }
      `}
    >
      <div css={{ gap: 8 }}>
        <AccountDetails
          address={props.member.address}
          name={props.member.nickname}
          disableCopy
          withAddressTooltip
          chain={props.chain}
          isNameLoading={props.isNameLoading}
        />
        {props.member.you ? <span className="text-offWhite text-[14px]"> (You)</span> : null}
      </div>
      <div css={{ gap: 16 }}>
        {props.onDelete ? (
          <div
            onClick={props.onDelete}
            css={({ foreground }) => ({ color: `rgb(${foreground})`, cursor: 'pointer', height: 16 })}
          >
            <Trash size={16} />
          </div>
        ) : (
          <div />
        )}
        <a
          css={{ lineHeight: 1, height: 16 }}
          href={props.member.address.toSubscanUrl(props.chain)}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size="16px" />
        </a>
      </div>
    </div>
  )
}

export default MemberRow
