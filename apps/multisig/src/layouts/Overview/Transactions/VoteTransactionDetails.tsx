import { useMemo } from 'react'
import { Transaction, TransactionType } from '@domains/multisig'
import { css } from '@emotion/css'
import { ExternalLink } from '@talismn/icons'
import AmountRow from '@components/AmountRow'
import { createConvictionsOpts } from '../../NewTransaction/Vote/ConvictionsDropdown'
import { VoteDetails } from '../../../domains/referenda'
import clsx from 'clsx'
import BN from 'bn.js'

type Props = {
  t: Transaction
}

// TODO: make this component support UI for Split vote types
export const VotePill: React.FC<{ voteDetails: VoteDetails }> = ({ voteDetails }) => {
  const { method, convictionVote } = voteDetails

  const getLabelAndColor = (): Record<string, string> => {
    if (method === 'removeVote') {
      return { label: 'Remove', color: 'bg-white' }
    } else if (convictionVote === 'SplitAbstain') {
      return { label: 'Abstain', color: 'bg-[#B9D9FF]' }
    } else if (voteDetails.details.Standard?.vote.aye) {
      return { label: 'Aye', color: 'bg-[#21C91D]' }
    }
    return { label: 'Nay', color: 'bg-[#F34A4A]' }
  }

  const { label, color } = getLabelAndColor()

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
      <div className={clsx('rounded-full h-[14px] w-[14px]', color)} />
      <p css={{ fontSize: '14px', marginTop: '4px' }}>{label}</p>
    </div>
  )
}

export const VoteTransactionHeaderContent: React.FC<Props> = ({ t }) => {
  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { convictionVote, details, token } = t.decoded.voteDetails
  const { Standard, SplitAbstain } = details

  const amount =
    convictionVote === 'SplitAbstain'
      ? Object.values(SplitAbstain!).reduce((acc, balance) => acc.add(balance), new BN(0))
      : new BN(0)

  return (
    <div className="flex items-center">
      <div css={{ marginRight: '8px' }}>
        <VotePill voteDetails={t.decoded.voteDetails} />
      </div>
      <AmountRow
        balance={{
          amount: convictionVote === 'Standard' ? Standard?.balance! : amount,
          token,
        }}
      />
    </div>
  )
}

export const VoteExpandedDetails: React.FC<Props> = ({ t }) => {
  const renderExpandedDetails = useMemo(() => {
    if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

    const convictionsOptions = createConvictionsOpts()
    const {
      details: { Standard, SplitAbstain },
      token,
    } = t?.decoded?.voteDetails

    if (Standard) {
      return (
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
      )
    }
    if (SplitAbstain) {
      return (
        <>
          {Object.entries(SplitAbstain!)
            .map(([key, balance]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="first-letter:uppercase">{key} vote value</p>
                <AmountRow
                  balance={{
                    amount: balance,
                    token,
                  }}
                />
              </div>
            ))
            .reverse()}
        </>
      )
    }
  }, [t.decoded?.type, t?.decoded?.voteDetails])

  if (t.decoded?.type !== TransactionType.Vote || !t.decoded.voteDetails) return null

  const { referendumId } = t?.decoded?.voteDetails
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
          <VotePill voteDetails={t.decoded.voteDetails} />
        </div>
        {renderExpandedDetails}
      </div>
    </div>
  )
}
