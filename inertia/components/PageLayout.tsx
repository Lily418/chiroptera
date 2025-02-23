import React from "react"

export const PageLayout = ({children}: {children: React.ReactNode}) => {
  return <div className="flex flex-col items-center py-4 px-3">{children}</div>
}
