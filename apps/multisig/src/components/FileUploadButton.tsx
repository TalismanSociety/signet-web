import { Plus } from '@talismn/icons'
import { useRef } from 'react'
import { Button } from './ui/button'

type Props = {
  label?: string
  accept?: string
  onFiles?: (files: File[]) => void
  multiple?: boolean
}
const FileUploadButton: React.FC<Props> = ({ accept, label, multiple, onFiles }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (!inputRef.current) return
    inputRef.current.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    onFiles?.(Array.from(e.target.files))
  }

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        className="hidden h-0 w-0 opacity-0"
        multiple={multiple}
        onChange={handleFileChange}
        // @ts-ignore clear the input value so that the same file can be uploaded again
        onClick={e => (e.target.value = null)}
      />
      <Button variant="secondary" onClick={handleClick} size="lg">
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            svg: {
              color: 'var(--color-primary)',
            },
          }}
        >
          <Plus size={16} />
          <p
            css={{
              fontSize: 14,
              lineHeight: '14px',
              marginTop: 2,
              color: 'var(--color-offWhite)',
            }}
          >
            {label}
          </p>
        </div>
      </Button>
    </>
  )
}

export default FileUploadButton
