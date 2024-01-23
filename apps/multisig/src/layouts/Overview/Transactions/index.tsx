import { Tabs, TabsList, TabsTrigger } from '@components/ui/tabs'
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
    <Tabs
      defaultValue={defaultTab}
      value={defaultTab}
      className="bg-gray-800 rounded-[16px] flex flex-col p-[24px] lg:w-[100px] lg:flex-[6]"
    >
      <TabsList className="flex items-center justify-start font-bold">
        <TabsTrigger value="pending" onClick={() => navigate(`/overview`)}>
          Pending
        </TabsTrigger>
        <TabsTrigger value="draft" onClick={() => navigate(`/overview?tab=draft`)}>
          Draft
        </TabsTrigger>
        <TabsTrigger value="history" onClick={() => navigate(`/overview?tab=history`)}>
          History
        </TabsTrigger>
      </TabsList>

      <PendingTansactions value="pending" />
      <DraftTransactionsList value="draft" />
      <ConfirmedTransactions value="history" />
    </Tabs>
  )
}

export default Transactions
