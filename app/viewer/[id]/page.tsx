import ViewerClient from './ViewerClient'
import { mockPapers } from '@/lib/paper/mock-papers'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return mockPapers.map((paper) => ({
    id: paper.id,
  }))
}

export default function Page() {
  return <ViewerClient />
}
