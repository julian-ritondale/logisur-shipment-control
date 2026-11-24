import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ExportDetailPage } from '@/pages/export-detail-page'
import { ExportsPage } from '@/pages/exports-page'
import { OverviewPage } from '@/pages/overview-page'
import { RunDetailPage } from '@/pages/run-detail-page'
import { RunsPage } from '@/pages/runs-page'
import { SearchPage } from '@/pages/search-page'
import { ShipmentDetailPage } from '@/pages/shipment-detail-page'
import { ShipmentsPage } from '@/pages/shipments-page'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="shipments" element={<ShipmentsPage />} />
              <Route path="shipments/:id" element={<ShipmentDetailPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="exports" element={<ExportsPage />} />
              <Route path="exports/:id" element={<ExportDetailPage />} />
              <Route path="runs" element={<RunsPage />} />
              <Route path="runs/:id" element={<RunDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster theme="light" richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
