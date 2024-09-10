import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@components/ui/input'
import { useOnClickOutside } from '@domains/common/useOnClickOutside'

interface DropdownProps<T> {
  options: T[]
  displayKey: keyof T
  selectedOption: T
  onSelect: (option: T) => void
  fetchMoreOptions: () => void
  hasMore: boolean
  isLoading: boolean
}

const CreatableDropdown = <T extends {}>({
  options,
  selectedOption,
  displayKey,
  onSelect,
  fetchMoreOptions,
  hasMore,
  isLoading,
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(containerRef.current, () => setIsOpen(false))

  const toggleDropdown = () => setIsOpen(!isOpen)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    onSelect({ [displayKey]: value } as T)
    setIsOpen(true)
  }

  const handleSelect = (option: T) => {
    onSelect(option)
    setIsOpen(false)
  }

  const handleScroll = () => {
    if (!dropdownRef.current || !hasMore || isLoading) return
    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      fetchMoreOptions()
    }
  }

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      })
    }
  }

  useEffect(() => {
    // Helps to update the size to prevent overflow on parent component
    updateDropdownPosition()
    const handleResize = () => {
      updateDropdownPosition()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const selectedOptionLabel = selectedOption[displayKey] as string

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <button type="button" className="w-full  rounded-md shadow-sm text-left" onClick={toggleDropdown}>
        <Input
          type="text"
          placeholder={selectedOptionLabel || 'Search or create...'}
          value={selectedOptionLabel || ''}
          onChange={handleInputChange}
          className="w-full focus:outline-none"
          onClear={() => onSelect({ [displayKey]: '' } as T)}
          showClearButton={!!selectedOptionLabel}
          loading={isLoading && isOpen}
        />
      </button>

      <div
        ref={dropdownRef}
        onScroll={handleScroll}
        className={`fixed z-10 mt-3 py-2 w-full max-h-48 overflow-y-auto bg-gray-800 rounded-[8px] shadow-lg transition-all duration-200 ease-in-out transform ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'
        }`}
        style={dropdownStyle}
      >
        {options.map((option, index) => (
          <div
            key={index}
            onClick={() => handleSelect(option)}
            className="px-5 py-2 cursor-pointer hover:brightness-125"
          >
            {option[displayKey] as unknown as string}
          </div>
        ))}

        {options.length === 0 && (
          <>
            {selectedOptionLabel ? (
              <div
                onClick={() => handleSelect(selectedOption)}
                className="px-5 py-2 cursor-pointer hover:brightness-125"
              >{`Create ${selectedOptionLabel}`}</div>
            ) : (
              <div className="py-6 cursor text-center">No result found.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CreatableDropdown
