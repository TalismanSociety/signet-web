import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@components/ui/pagination'
import { Button } from '@components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const AddressBookPagination = ({
  currentPage,
  totalPages,
  onNextPage,
  isNextPageDisabled,
  onPreviousPage,
  isPreviousPageDisabled,
}: {
  currentPage: number
  totalPages: number
  onNextPage: () => void
  onPreviousPage: () => void
  isNextPageDisabled: boolean
  isPreviousPageDisabled: boolean
}) => {
  return (
    <Pagination className="items-center justify-end">
      <p className="text-right text-offWhite text-[14px] mt-[3px] mr-[8px]">
        Page {currentPage} of {totalPages}
      </p>
      <PaginationContent>
        <PaginationItem>
          {isPreviousPageDisabled ? (
            <Button size="icon" disabled variant="secondary">
              <ChevronLeft className="h-[16px] w-[16px]" />
            </Button>
          ) : (
            <PaginationPrevious href={`#${currentPage - 1}`} onClick={onPreviousPage} />
          )}
        </PaginationItem>
        <PaginationItem>
          {isNextPageDisabled ? (
            <Button size="icon" disabled variant="secondary">
              <ChevronRight className="h-[16px] w-[16px]" />
            </Button>
          ) : (
            <PaginationNext href={`#${currentPage + 1}`} onClick={onNextPage} />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export default AddressBookPagination
