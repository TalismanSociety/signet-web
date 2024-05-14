import { Transaction, TransactionType } from '@domains/multisig'
import { css } from '@emotion/css'
import { ExternalLink } from '@talismn/icons'
import AmountRow from '@components/AmountRow'
import { createConvictionsOpts } from '../../NewTransaction/Vote/ConvictionsDropdown'
import { VoteDetails, ConvictionVote } from '../../../domains/referenda'
import clsx from 'clsx'
import BN from 'bn.js'

type Props = {
  t: Transaction
}

// TODO: make this component support UI for Split vote types
const VotePill: React.FC<{ details: VoteDetails['details'] }> = ({ details }) => {
  const conviction: ConvictionVote = !!details.Standard ? 'Standard' : 'SplitAbstain'
  const isStandard = conviction === 'Standard'

  return (
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
        className={clsx('rounded-full h-[14px] w-[14px]', {
          'bg-[#21C91D]': isStandard && details.Standard?.vote.aye,
          'bg-[#F34A4A]': isStandard && !details.Standard?.vote.aye,
          'bg-[#B9D9FF]': !isStandard,
        })}
      />
      <p css={{ fontSize: '14px', marginTop: '4px' }}>
        {isStandard ? (details.Standard?.vote.aye ? 'Aye' : 'Nay') : 'Abstain'}
      </p>
    </div>
  )
}

export const VoteTransactionHeaderContent: React.FC<Props> = ({ t }) => {
  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { details, token } = t.decoded.voteDetails
  const { Standard, SplitAbstain } = details

  if (!Standard && !SplitAbstain) return null

  const amount = !!Standard
    ? Standard.balance
    : Object.values(SplitAbstain!).reduce((acc, balance) => acc.add(balance), new BN(0))

  return (
    <div className="flex items-center">
      <div css={{ marginRight: '8px' }}>
        <VotePill details={details} />
      </div>
      <AmountRow
        balance={{
          amount: amount,
          token,
        }}
      />
    </div>
  )
}

export const VoteExpandedDetails: React.FC<Props> = ({ t }) => {
  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { details, token, referendumId } = t.decoded.voteDetails
  const { Standard, SplitAbstain } = details

  const convictionsOptions = createConvictionsOpts()

  if (!Standard && !SplitAbstain) return null
  // TODO: Continue from here

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
        {Standard ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[16px]">Vote value</p>
              <AmountRow
                balance={{
                  amount: Standard.balance,
                  token,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p>Conviction</p>
              <p>{convictionsOptions[Standard.vote.conviction]?.headlineText ?? 'Unknown'}</p>
            </div>
          </>
        ) : (
          Object.entries(SplitAbstain!)
            .map(([key, balance]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="capitalize">{key}</p>
                <AmountRow
                  balance={{
                    amount: balance,
                    token,
                  }}
                />
              </div>
            ))
            .reverse()
        )}
      </div>
    </div>
  )
}
