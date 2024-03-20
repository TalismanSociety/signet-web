import { Button, ButtonProps } from '@components/ui/button'

type Props = {
  block?: boolean
  cancel?: ButtonProps
  next: ButtonProps
}

export const CancleOrNext: React.FC<Props> = ({ block, cancel, next }) => (
  <div
    css={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      width: '100%',
    }}
  >
    {cancel && <Button {...cancel} variant={cancel.variant ?? 'outline'} children={cancel.children ?? 'Cancel'} />}
    <Button {...next} children={next.children ?? 'Next'} />
  </div>
)
