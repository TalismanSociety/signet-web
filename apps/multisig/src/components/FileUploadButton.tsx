import { Plus } from '@talismn/icons'
import { useRef } from 'react'
import { Button, ButtonProps } from './ui/button'

type Props = ButtonProps & {
  label?: string
  accept?: string
  onFiles?: (files: File[]) => void
  multiple?: boolean
}
const FileUploadButton: React.FC<Props> = ({ accept, label, multiple, onFiles, variant = 'secondary' }) => {
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
    <Button className="h-max py-[8px] gap-[8px]" variant={variant} onClick={handleClick} size="lg">
      <div css={{ color: 'var(--color-primary)' }}>
        <Plus size={16} />
      </div>
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
      <p className="mt-[4px]">{label}</p>
    </Button>
  )
}

export default FileUploadButton
