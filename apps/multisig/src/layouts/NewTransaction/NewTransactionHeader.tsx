import React from 'react'

export const NewTransactionHeader: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode }>> = ({
  children,
  icon,
}) => (
  <div css={({ color }) => ({ display: 'flex', alignItems: 'center', gap: 12, color: color.offWhite })}>
    {icon}
    <h2 className="mt-[4px] font-bold">{children}</h2>
  </div>
)
