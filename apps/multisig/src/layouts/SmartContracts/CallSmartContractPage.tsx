import { Navigate, useParams } from 'react-router-dom'

export const CallSmartContractPage: React.FC = () => {
  const { smartContractId } = useParams<{ smartContractId: string }>()

  if (!smartContractId) return <Navigate to="smart-contracts" />

  return (
    <div>
      <p>{smartContractId}</p>
    </div>
  )
}
