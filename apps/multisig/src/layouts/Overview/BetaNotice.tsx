import Modal from '@components/Modal'
import { Checkbox } from '@components/ui/checkbox'
import persist from '@domains/persist'
import { Button } from '@talismn/ui'
import { useCallback, useState } from 'react'
import { atom, selector, useRecoilState } from 'recoil'

// create atom to track whether it's been opened
export const betaWarningOpenedState = atom({
  key: 'betaWarningOpenedState',
  default: true,
})

const dontShowAgainState = atom({
  key: 'dontShowAgainState',
  default: false,
  effects_UNSTABLE: [persist],
})

export const isBetaNoticeOpenState = selector({
  key: 'isBetaNoticeOpenState',
  get: ({ get }) => {
    const isOpen = get(betaWarningOpenedState)
    const dontShowAgain = get(dontShowAgainState)
    return isOpen && !dontShowAgain
  },
})

const BetaNotice = () => {
  const [isOpen, setIsOpen] = useRecoilState(betaWarningOpenedState)
  const [dontShowAgain, setDontShowAgain] = useRecoilState(dontShowAgainState)
  const [_dontShowAgain, setLocalDontShowAgain] = useState(false)

  const close = useCallback(() => {
    setIsOpen(false)
    if (_dontShowAgain) setDontShowAgain(true)
  }, [_dontShowAgain, setDontShowAgain, setIsOpen])

  return (
    <Modal
      isOpen={!dontShowAgain && isOpen}
      onAfterOpen={() => {}}
      onRequestClose={() => {
        setIsOpen(false)
      }}
      contentLabel="Beta Notice"
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      borderRadius={32}
    >
      <div
        css={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}
      >
        <div
          css={{
            display: 'grid',
            justifyItems: 'center',
          }}
        >
          <h1>Welcome to Signet!</h1>
          <br />
          <span>
            Signet is under active development and a Beta Service as defined in our{' '}
            <a
              css={{ textDecoration: 'underline' }}
              href={'https://docs.talisman.xyz/talisman/prepare-for-your-journey/terms-of-use'}
              target="_blank"
              rel="noreferrer"
            >
              Terms of Service
            </a>
            .
          </span>
          <br />
          <p>Please use with caution.</p>
          <br />
          <Button css={{ width: '164px' }} onClick={close}>
            I understand
          </Button>

          <div className="flex items-center gap-[8px] mt-[24px]">
            <Checkbox
              id="beta-popup"
              checked={_dontShowAgain}
              onCheckedChange={checked => setLocalDontShowAgain(!!checked)}
            />
            <label htmlFor="beta-popup" className="select-none mt-[3px]">
              Do not show this again.
            </label>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default BetaNotice
