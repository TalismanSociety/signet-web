import { PageTabs, PageTabsList, PageTabsTrigger } from '@components/ui/page-tabs'
import { PendingTansactions } from './PendingTransactions'
import { ConfirmedTransactions } from './ConfirmedTransactions'
import { DraftTransactionsList } from './DraftTransactionsList'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'

const Transactions = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParam = useMemo(() => new URLSearchParams(location.search), [location.search])

  const defaultTab = useMemo(() => {
    const searchTab = searchParam.get('tab')
    switch (searchTab) {
      case 'draft':
        return 'draft'
      case 'history':
        return 'history'
      default:
        return 'pending'
    }
  }, [searchParam])

  return (
    <PageTabs
      defaultValue={defaultTab}
      value={defaultTab}
      className="bg-gray-800 rounded-[16px] flex flex-col p-[24px] lg:w-[100px] lg:flex-[6]"
    >
      <PageTabsList className="flex items-center justify-start font-bold">
        <PageTabsTrigger value="pending" onClick={() => navigate(`/overview`)}>
          Pending
        </PageTabsTrigger>
        <PageTabsTrigger value="draft" onClick={() => navigate(`/overview?tab=draft`)}>
          Draft
        </PageTabsTrigger>
        <PageTabsTrigger value="history" onClick={() => navigate(`/overview?tab=history`)}>
          History
        </PageTabsTrigger>
      </PageTabsList>

      <PendingTansactions value="pending" />
      <DraftTransactionsList value="draft" />
      <ConfirmedTransactions value="history" />
    </PageTabs>
  )
}

export default Transactions
