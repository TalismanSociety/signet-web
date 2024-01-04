import { Layout } from '../Layout'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SmartContractsDashboard } from './SmartContractsDashboard'
import { Button } from '../../components/ui/button'
import { ChevronLeft } from '@talismn/icons'
import { AddContractPage } from './AddContractPage'
import { CallSmartContractPage } from './CallSmartContractPage'

const SubpageWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="flex flex-col pl-[0px] lg:px-[4%] py-[16px] gap-[16px] flex-1 overflow-auto">
    <div className="flex flex-col">
      <Button className="gap-[8px]" size="lg" variant="secondary" asLink to="/smart-contracts">
        <ChevronLeft size={16} />
        <p className="mt-[3px]">Back</p>
      </Button>
    </div>
    {children}
  </div>
)
export const SmartContracts: React.FC = () => (
  <Layout selected="Smart Contracts" requiresMultisig>
    <Routes>
      <Route index path="/" element={<SmartContractsDashboard />} />
      <Route
        path="add"
        element={
          <SubpageWrapper>
            <AddContractPage />
          </SubpageWrapper>
        }
      />
      <Route
        path="deploy"
        element={
          <SubpageWrapper>
            <p>Deploy</p>
          </SubpageWrapper>
        }
      />
      <Route
        path="call/:smartContractId"
        element={
          <SubpageWrapper>
            <CallSmartContractPage />
          </SubpageWrapper>
        }
      />
      <Route path="*" element={<Navigate to="/smart-contracts" />} />
    </Routes>
  </Layout>
)

export default SmartContracts
