import { MarketplaceShell } from '@/components/marketplace-vibe/MarketplaceShell'

export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketplaceShell>{children}</MarketplaceShell>
}
