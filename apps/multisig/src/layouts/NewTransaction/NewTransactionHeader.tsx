import React from 'react'

export const NewTransactionHeader: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode; title?: string }>> = ({
  children,
  icon,
  title,
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-[12px] text-offWhite">
      {icon}
      <h2 className="mt-[4px] font-bold">{title}</h2>
    </div>
    {children}
  </div>
)
