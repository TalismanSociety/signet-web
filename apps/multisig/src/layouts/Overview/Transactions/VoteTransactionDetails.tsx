import { Transaction, TransactionType } from '@domains/multisig'
import { css } from '@emotion/css'
import { ExternalLink } from '@talismn/icons'
import AmountRow from '@components/AmountRow'
import { createConvictionsOpts } from '../../NewTransaction/Vote/ConvictionsDropdown'
import { VoteDetails } from '../../../domains/referenda'

type Props = {
  t: Transaction
}

// TODO: make this component support UI for Abstain and Split vote types
const VotePill: React.FC<{ details: VoteDetails['details'] }> = ({ details }) => (
  <div
    className={css`
      align-items: center;
      background-color: var(--color-backgroundLighter);
      border-radius: 12px;
      color: var(--color-foreground);
      display: flex;
      gap: 8px;
      padding: 2px 8px;
    `}
  >
    <div
      className={css`
        background-color: var(--color-status-${details.Standard?.vote.aye ? 'positive' : 'negative'});
        border-radius: 50%;
        height: 14px;
        width: 14px;
      `}
    />
    <p css={{ fontSize: '14px', marginTop: '4px' }}>{details.Standard?.vote.aye ? 'Aye' : 'Nay'}</p>
  </div>
)

export const VoteTransactionHeaderContent: React.FC<Props> = ({ t }) => {
  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { details, token } = t.decoded.voteDetails

  if (!details.Standard) return null

  return (
    <div className="flex items-center">
      <div css={{ marginRight: '8px' }}>
        <VotePill details={details} />
      </div>
      <AmountRow
        balance={{
          amount: details.Standard.balance,
          token,
        }}
      />
    </div>
  )
}

export const VoteExpandedDetails: React.FC<Props> = ({ t }) => {
  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { details, token, referendumId } = t.decoded.voteDetails
  const convictionsOptions = createConvictionsOpts()

  if (!details.Standard) return null

  const name = `Referendum #${referendumId}`

  return (
    <div css={{ paddingBottom: '8px' }}>
      <div className="grid gap-[16px]">
        <div className="flex items-center justify-between">
          {!!t.multisig.chain.polkaAssemblyUrl ? (
            <a
              className="text-[16px] text-offWhite hover:text-primary flex items-center"
              href={`${t.multisig.chain.polkaAssemblyUrl}/referenda/${referendumId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
              <span className="mb-[4px] ml-[8px]">
                <ExternalLink size={14} />
              </span>
            </a>
          ) : (
            <p css={{ color: 'var(--color-offWhite)' }}>{name}</p>
          )}
          <VotePill details={details} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[16px]">Vote value</p>
          <AmountRow
            balance={{
              amount: details.Standard.balance,
              token,
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p>Conviction</p>
          <p>{convictionsOptions[details.Standard.vote.conviction]?.headlineText ?? 'Unknown'}</p>
        </div>
      </div>
    </div>
  )
}
