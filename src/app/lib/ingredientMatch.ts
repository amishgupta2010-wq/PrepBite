// Product words that make an ingredient fundamentally different
const PRODUCT_WORDS = [
  'ketchup', 'sauce', 'paste', 'butter', 'oil', 'vinegar',
  'powder', 'flour', 'cream', 'juice', 'syrup', 'extract',
  'jam', 'jelly', 'spread', 'dressing', 'mayo', 'mayonnaise',
  'mustard', 'relish', 'stock', 'broth', 'wine', 'beer',
  'liqueur', 'milk', 'yogurt', 'cheese', 'chips', 'crackers',
];

const ADJECTIVES = [
  'fresh', 'frozen', 'dried', 'canned', 'organic', 'raw',
  'cooked', 'chopped', 'diced', 'sliced', 'minced', 'grated',
  'shredded', 'whole', 'ground', 'crushed', 'large', 'small',
  'medium', 'baby', 'mini', 'cherry', 'roma', 'vine',
  'ripe', 'unripe', 'sweet', 'hot', 'mild', 'spicy',
  'boneless', 'skinless', 'lean', 'extra', 'light', 'dark',
  'plain', 'unsalted', 'salted', 'smoked', 'roasted',
  'toasted', 'blanched', 'peeled', 'pitted', 'seedless',
];

/** Normalize an ingredient to its base form. */
export function normalizeIngredient(name: string): string {
  let n = name.toLowerCase().trim();
  n = n.replace(/\(.*?\)/g, '').trim();
  n = n.replace(/^\d+[\s/]*\d*\s*(oz|ounce|lb|pound|cup|tbsp|tsp|ml|g|kg|tablespoon|teaspoon|can|package|bunch|clove|sprig|head|stalk|piece)s?\s*/i, '').trim();

  // If it contains a product word, keep it distinct
  const hasProduct = PRODUCT_WORDS.some(pw => n.includes(pw));
  if (hasProduct) return n;

  // Strip adjectives
  for (const adj of ADJECTIVES) {
    n = n.replace(new RegExp(`\\b${adj}\\b`, 'gi'), '').trim();
  }
  n = n.replace(/\b(leaves|leaf|stems|stem|cloves|clove|sprigs|sprig|stalks|stalk)\b/gi, '').trim();

  // Simple depluralize
  if (n.endsWith('ies')) n = n.slice(0, -3) + 'y';
  else if (n.endsWith('oes')) n = n.slice(0, -2);
  else if (n.endsWith('es') && !n.endsWith('ses') && !n.endsWith('ches') && !n.endsWith('shes')) n = n.slice(0, -2);
  else if (n.endsWith('s') && !n.endsWith('ss') && !n.endsWith('us')) n = n.slice(0, -1);

  return n.replace(/\s+/g, ' ').trim();
}

/** Check if two ingredient names refer to the same base ingredient. */
export function isSameIngredient(a: string, b: string): boolean {
  const normA = normalizeIngredient(a);
  const normB = normalizeIngredient(b);
  if (normA === normB) return true;

  const aHasProduct = PRODUCT_WORDS.some(pw => normA.includes(pw));
  const bHasProduct = PRODUCT_WORDS.some(pw => normB.includes(pw));
  if (aHasProduct || bHasProduct) return false;

  return normA.includes(normB) || normB.includes(normA);
}

/** Check if a recipe ingredient is in the user's list. */
export function isIngredientAvailable(recipeIngredient: string, userIngredients: string[]): boolean {
  return userIngredients.some(ui => isSameIngredient(recipeIngredient, ui));
}

/** Deduplicate and count ingredients. */
export function deduplicateIngredients(ingredients: { name: string }[]): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const ing of ingredients) {
    const normalized = normalizeIngredient(ing.name);
    const existing = map.get(normalized);
    if (existing) {
      existing.count += 1;
    } else {
      const displayName = ing.name.charAt(0).toUpperCase() + ing.name.slice(1).toLowerCase();
      map.set(normalized, { name: displayName, count: 1 });
    }
  }
  return Array.from(map.values());
}
