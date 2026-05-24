import { createClient } from '@/lib/supabase/server'

export async function getCategoriesWithCounts() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      parent_id,
      sort_order
    `)
    .eq('is_active', true)
    .order('sort_order')

  if (error || !categories) {
    console.error('Error fetching categories:', error)
    return []
  }

  const childrenByParent = new Map<string, string[]>()
  for (const c of categories) {
    if (!c.parent_id) continue
    const arr = childrenByParent.get(c.parent_id) ?? []
    arr.push(c.id)
    childrenByParent.set(c.parent_id, arr)
  }

  // Get product counts for each category (parents include their children)
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const childIds = childrenByParent.get(category.id) ?? []
      const categoryIds = [category.id, ...childIds]

      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .eq('approval_status', 'approved')

      return {
        name: category.name,
        slug: category.slug,
        count: count || 0,
      }
    })
  )

  return categoriesWithCounts
}
