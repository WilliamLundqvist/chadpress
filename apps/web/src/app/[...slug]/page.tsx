import { WpContentPage } from "../../components/wp-content-page"
import { toWordPressUri } from "../../lib/wp-block-query"

type PageProps = {
  params: Promise<{
    slug: string[]
  }>
}

export default async function UniversalWordPressPage({ params }: PageProps) {
  const { slug } = await params
  return <WpContentPage uri={toWordPressUri(slug)} />
}
