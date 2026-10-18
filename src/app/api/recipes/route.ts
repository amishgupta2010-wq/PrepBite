import { NextRequest, NextResponse } from 'next/server';
import { parseIngredientsWithGroq } from '../../../lib/ingredientParser';

// Allow TLS connections on environments with custom or Windows root certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

interface RecipeStep {
  number: number;
  step: string;
}

interface RecipeMeal {
  id: number;
  title: string;
  type: string;
  image: string;
  readyInMinutes: number;
  calories: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

const FOOD_IMAGES: Record<string, string> = {
  chicken: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
  beef: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  salmon: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281270?w=600&q=80',
  curry: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80',
  stirfry: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  bowl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80',
  salad: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  rice: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600&q=80',
  general: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
};

function pickRecipeImage(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('chicken') || lower.includes('turkey') || lower.includes('poultry')) return FOOD_IMAGES.chicken;
  if (lower.includes('salmon') || lower.includes('fish') || lower.includes('shrimp') || lower.includes('tuna') || lower.includes('seafood')) return FOOD_IMAGES.salmon;
  if (lower.includes('beef') || lower.includes('steak') || lower.includes('pork') || lower.includes('meat')) return FOOD_IMAGES.beef;
  if (lower.includes('pasta') || lower.includes('spaghetti') || lower.includes('noodle') || lower.includes('lasagna')) return FOOD_IMAGES.pasta;
  if (lower.includes('curry') || lower.includes('tikka') || lower.includes('masala')) return FOOD_IMAGES.curry;
  if (lower.includes('stir-fry') || lower.includes('stir fry') || lower.includes('wok')) return FOOD_IMAGES.stirfry;
  if (lower.includes('soup') || lower.includes('stew') || lower.includes('chowder')) return FOOD_IMAGES.soup;
  if (lower.includes('salad')) return FOOD_IMAGES.salad;
  if (lower.includes('bowl')) return FOOD_IMAGES.bowl;
  if (lower.includes('rice') || lower.includes('risotto') || lower.includes('quinoa')) return FOOD_IMAGES.rice;
  return FOOD_IMAGES.general;
}

/**
 * Pre-defined schedule duration mapping for days 2 to 7.
 * Sum is always exactly 7 days.
 * The first cooking session starts at offset 0 (Today).
 */
const DAY_DURATIONS: Record<number, number[]> = {
  2: [3, 4],             // Day 0 (3 days), Day 3 (4 days)
  3: [2, 2, 3],          // Day 0 (2 days), Day 2 (2 days), Day 4 (3 days) -> e.g. Mon-Tue, Wed-Thu, Fri-Sun
  4: [2, 2, 2, 1],       // Day 0 (2 days), Day 2 (2 days), Day 4 (2 days), Day 6 (1 day)
  5: [2, 1, 2, 1, 1],    // Day 0 (2 days), Day 2 (1 day), Day 3 (2 days), Day 5 (1 day), Day 6 (1 day)
  6: [1, 1, 1, 1, 1, 2], // 5 single days + 1 two-day block
  7: [1, 1, 1, 1, 1, 1, 1], // Everyday
};

function computeCookingSchedule(cookDays: number, baseDate: Date): { dayName: string; eatOn: string }[] {
  const durations = DAY_DURATIONS[cookDays] || DAY_DURATIONS[7];
  let currentOffset = 0;

  return durations.map((duration) => {
    const cookDate = new Date(baseDate);
    cookDate.setDate(cookDate.getDate() + currentOffset);

    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + currentOffset + duration - 1);

    const dayName = cookDate.toLocaleDateString('en-US', { weekday: 'long' });
    const startShort = cookDate.toLocaleDateString('en-US', { weekday: 'short' });
    const endShort = endDate.toLocaleDateString('en-US', { weekday: 'short' });

    const eatOn = duration === 1 
      ? `Eat on ${startShort}` 
      : `Eat on ${startShort}–${endShort}`;

    currentOffset += duration;

    return { dayName, eatOn };
  });
}

/**
 * Rich curated culinary fallback recipes with complete ingredients and detailed steps.
 */
const CURATED_RECIPES: RecipeMeal[] = [
  {
    id: 9001,
    title: 'Garlic Herb Butter Chicken with Roasted Asparagus',
    type: 'Dinner',
    image: FOOD_IMAGES.chicken,
    readyInMinutes: 25,
    calories: 620,
    ingredients: [
      { name: 'chicken breasts', amount: 300, unit: 'g' },
      { name: 'fresh asparagus', amount: 200, unit: 'g' },
      { name: 'unsalted butter', amount: 2, unit: 'tbsp' },
      { name: 'olive oil', amount: 1, unit: 'tbsp' },
      { name: 'garlic cloves (minced)', amount: 4, unit: 'cloves' },
      { name: 'fresh rosemary', amount: 1, unit: 'tsp' },
      { name: 'smoked paprika', amount: 0.5, unit: 'tsp' },
      { name: 'lemon juice', amount: 1, unit: 'tbsp' },
      { name: 'sea salt', amount: 1, unit: 'tsp' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp' },
    ],
    steps: [
      { number: 1, step: 'Pat chicken breasts completely dry with paper towels and season with salt, pepper, and smoked paprika.' },
      { number: 2, step: 'Snap the woody ends off asparagus spears and toss them with olive oil and a pinch of salt.' },
      { number: 3, step: 'Heat a heavy skillet over medium-high heat. Add 1 tbsp butter and sear chicken for 5-6 minutes per side until golden.' },
      { number: 4, step: 'Push chicken to one side, add asparagus, minced garlic, remaining butter, and rosemary.' },
      { number: 5, step: 'Sauté asparagus for 4-5 minutes while basting chicken with melted garlic butter.' },
      { number: 6, step: 'Squeeze fresh lemon juice over the pan and serve hot.' },
    ],
  },
  {
    id: 9002,
    title: 'Mediterranean Baked Salmon & Herb Quinoa',
    type: 'Dinner',
    image: FOOD_IMAGES.salmon,
    readyInMinutes: 25,
    calories: 640,
    ingredients: [
      { name: 'salmon fillet', amount: 250, unit: 'g' },
      { name: 'quinoa', amount: 0.75, unit: 'cup' },
      { name: 'cherry tomatoes', amount: 1, unit: 'cup' },
      { name: 'kalamata olives', amount: 0.25, unit: 'cup' },
      { name: 'extra virgin olive oil', amount: 2, unit: 'tbsp' },
      { name: 'lemon', amount: 1, unit: 'whole' },
      { name: 'garlic cloves', amount: 2, unit: 'cloves' },
      { name: 'dried oregano', amount: 1, unit: 'tsp' },
      { name: 'feta cheese', amount: 30, unit: 'g' },
      { name: 'sea salt', amount: 0.75, unit: 'tsp' },
    ],
    steps: [
      { number: 1, step: 'Preheat oven to 200°C (400°F) and line a baking sheet with parchment paper.' },
      { number: 2, step: 'Rinse quinoa and simmer in 1.5 cups water with a pinch of salt for 15 minutes until fluffy.' },
      { number: 3, step: 'Place salmon, cherry tomatoes, and halved olives on the baking sheet.' },
      { number: 4, step: 'Whisk olive oil, minced garlic, oregano, lemon zest, salt, and pepper; drizzle evenly over salmon and veggies.' },
      { number: 5, step: 'Bake for 12-14 minutes until salmon flakes easily with a fork.' },
      { number: 6, step: 'Fluff quinoa, stir in crumbled feta and lemon juice, then plate alongside the salmon and roasted tomatoes.' },
    ],
  },
  {
    id: 9003,
    title: 'Creamy Tuscan Garlic Herb Pasta',
    type: 'Dinner',
    image: FOOD_IMAGES.pasta,
    readyInMinutes: 20,
    calories: 610,
    ingredients: [
      { name: 'fettuccine or penne pasta', amount: 150, unit: 'g' },
      { name: 'sun-dried tomatoes', amount: 0.3, unit: 'cup' },
      { name: 'baby spinach', amount: 2, unit: 'cups' },
      { name: 'heavy cream or oat milk', amount: 0.75, unit: 'cup' },
      { name: 'parmesan cheese (grated)', amount: 0.3, unit: 'cup' },
      { name: 'garlic cloves (minced)', amount: 3, unit: 'cloves' },
      { name: 'olive oil', amount: 1, unit: 'tbsp' },
      { name: 'vegetable broth', amount: 0.5, unit: 'cup' },
      { name: 'italian seasoning', amount: 1, unit: 'tsp' },
      { name: 'black pepper & salt', amount: 1, unit: 'tsp' },
    ],
    steps: [
      { number: 1, step: 'Bring a pot of salted water to boil. Cook pasta al dente according to package instructions, reserving 1/4 cup pasta water.' },
      { number: 2, step: 'Heat olive oil in a skillet over medium heat. Sauté minced garlic and sun-dried tomatoes for 1-2 minutes until fragrant.' },
      { number: 3, step: 'Pour in broth and cream, bringing to a gentle simmer for 3 minutes.' },
      { number: 4, step: 'Fold in baby spinach and Italian seasoning until spinach is wilted.' },
      { number: 5, step: 'Stir in grated parmesan cheese until the sauce turns smooth and velvety.' },
      { number: 6, step: 'Toss cooked pasta into the sauce, thinning with reserved pasta water if needed. Serve with extra cracked pepper.' },
    ],
  },
  {
    id: 9004,
    title: 'Crispy Honey Soy Beef & Broccoli Stir-Fry',
    type: 'Dinner',
    image: FOOD_IMAGES.stirfry,
    readyInMinutes: 20,
    calories: 630,
    ingredients: [
      { name: 'flank steak or lean beef strips', amount: 250, unit: 'g' },
      { name: 'broccoli florets', amount: 2, unit: 'cups' },
      { name: 'jasmine rice', amount: 0.75, unit: 'cup' },
      { name: 'low-sodium soy sauce', amount: 3, unit: 'tbsp' },
      { name: 'honey', amount: 1.5, unit: 'tbsp' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp' },
      { name: 'fresh ginger (grated)', amount: 1, unit: 'tsp' },
      { name: 'garlic cloves', amount: 3, unit: 'cloves' },
      { name: 'cornstarch', amount: 1, unit: 'tsp' },
      { name: 'sesame seeds', amount: 1, unit: 'tsp' },
    ],
    steps: [
      { number: 1, step: 'Cook jasmine rice according to package directions and keep warm.' },
      { number: 2, step: 'Whisk soy sauce, honey, sesame oil, grated ginger, minced garlic, cornstarch, and 2 tbsp water in a small bowl.' },
      { number: 3, step: 'Heat a wok or skillet over high heat with 1 tsp oil. Sear beef strips for 2-3 minutes until browned, then remove.' },
      { number: 4, step: 'Add broccoli florets with 2 tbsp water, cover and steam for 3 minutes until crisp-tender.' },
      { number: 5, step: 'Return beef to the pan, pour over the sauce, and toss vigorously for 1-2 minutes until thick and glossy.' },
      { number: 6, step: 'Garnish with toasted sesame seeds and serve over warm jasmine rice.' },
    ],
  },
  {
    id: 9005,
    title: 'Creamy Coconut Lentil & Spinach Curry',
    type: 'Dinner',
    image: FOOD_IMAGES.curry,
    readyInMinutes: 25,
    calories: 590,
    ingredients: [
      { name: 'red or brown lentils', amount: 1, unit: 'cup' },
      { name: 'coconut milk', amount: 1, unit: 'can (400ml)' },
      { name: 'canned crushed tomatoes', amount: 1, unit: 'cup' },
      { name: 'baby spinach', amount: 2, unit: 'cups' },
      { name: 'yellow onion (diced)', amount: 1, unit: 'medium' },
      { name: 'garlic cloves', amount: 3, unit: 'cloves' },
      { name: 'curry powder or garam masala', amount: 1.5, unit: 'tbsp' },
      { name: 'ground cumin', amount: 1, unit: 'tsp' },
      { name: 'olive oil', amount: 1, unit: 'tbsp' },
      { name: 'fresh cilantro', amount: 2, unit: 'tbsp' },
      { name: 'basmati rice', amount: 0.75, unit: 'cup' },
    ],
    steps: [
      { number: 1, step: 'Rinse lentils thoroughly in cold water. Cook basmati rice in a separate pot.' },
      { number: 2, step: 'Heat oil in a deep pot over medium heat. Sauté diced onion and minced garlic for 3-4 minutes until golden.' },
      { number: 3, step: 'Add curry powder, cumin, and a pinch of salt; stir constantly for 30 seconds to bloom spices.' },
      { number: 4, step: 'Add lentils, crushed tomatoes, coconut milk, and 1 cup water. Bring to a gentle boil.' },
      { number: 5, step: 'Reduce heat to low, cover, and simmer for 18-20 minutes until lentils are tender and creamy.' },
      { number: 6, step: 'Stir in baby spinach until wilted. Top with fresh cilantro and serve with fluffy basmati rice.' },
    ],
  },
  {
    id: 9006,
    title: 'Roasted Sweet Potato & Black Bean Fiesta Bowl',
    type: 'Dinner',
    image: FOOD_IMAGES.bowl,
    readyInMinutes: 25,
    calories: 580,
    ingredients: [
      { name: 'sweet potato (cubed)', amount: 1.5, unit: 'cups' },
      { name: 'black beans (rinsed & drained)', amount: 1, unit: 'can (15oz)' },
      { name: 'brown rice or quinoa', amount: 0.75, unit: 'cup' },
      { name: 'avocado (sliced)', amount: 0.5, unit: 'whole' },
      { name: 'sweet corn kernels', amount: 0.5, unit: 'cup' },
      { name: 'olive oil', amount: 1.5, unit: 'tbsp' },
      { name: 'chili powder', amount: 1, unit: 'tsp' },
      { name: 'ground cumin', amount: 0.5, unit: 'tsp' },
      { name: 'fresh lime', amount: 1, unit: 'whole' },
      { name: 'fresh salsa', amount: 0.25, unit: 'cup' },
    ],
    steps: [
      { number: 1, step: 'Preheat oven to 205°C (400°F). Toss cubed sweet potatoes with olive oil, chili powder, cumin, salt, and pepper.' },
      { number: 2, step: 'Spread on a baking sheet and roast for 20 minutes until fork-tender and caramelized.' },
      { number: 3, step: 'Warm black beans and corn in a small skillet with a squeeze of fresh lime juice and pinch of cumin.' },
      { number: 4, step: 'Assemble bowls: layer brown rice at the base, followed by roasted sweet potatoes, warm beans, and corn.' },
      { number: 5, step: 'Top with sliced avocado, fresh salsa, and a drizzle of lime juice.' },
    ],
  },
  {
    id: 9007,
    title: 'Lemon Herb Garlic Butter Shrimp with Rice',
    type: 'Dinner',
    image: FOOD_IMAGES.salmon,
    readyInMinutes: 15,
    calories: 570,
    ingredients: [
      { name: 'peeled and deveined shrimp', amount: 300, unit: 'g' },
      { name: 'jasmine rice', amount: 0.75, unit: 'cup' },
      { name: 'butter', amount: 2, unit: 'tbsp' },
      { name: 'olive oil', amount: 1, unit: 'tbsp' },
      { name: 'garlic cloves (minced)', amount: 4, unit: 'cloves' },
      { name: 'fresh parsley (chopped)', amount: 2, unit: 'tbsp' },
      { name: 'crushed red pepper flakes', amount: 0.25, unit: 'tsp' },
      { name: 'lemon juice & zest', amount: 1, unit: 'lemon' },
      { name: 'salt & black pepper', amount: 1, unit: 'tsp' },
    ],
    steps: [
      { number: 1, step: 'Cook jasmine rice according to package directions and set aside covered.' },
      { number: 2, step: 'Pat shrimp dry with paper towels; season lightly with salt and freshly cracked pepper.' },
      { number: 3, step: 'Heat olive oil and 1 tbsp butter in a skillet over medium-high heat.' },
      { number: 4, step: 'Add shrimp in a single layer and sear for 1.5 minutes without moving, then flip.' },
      { number: 5, step: 'Add remaining butter, minced garlic, red pepper flakes, and lemon zest; cook for another 1-2 minutes until shrimp turns opaque pink.' },
      { number: 6, step: 'Remove from heat, stir in fresh lemon juice and chopped parsley, and spoon generously over rice.' },
    ],
  },
];

/**
 * Generates realistic recipes via Groq AI using openai/gpt-oss-120b.
 */
async function generateRecipesWithGroq(
  count: number,
  diet: string,
  exclude: string,
  userIngs: string[],
  calTarget: number
): Promise<RecipeMeal[] | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are an expert chef for the PrepBite meal prep app.
Generate ${count} distinct, realistic, chef-quality dinner recipes.

Dietary constraints:
- Diet: ${diet || 'balanced / healthy'}
- Exclude/Allergies: ${exclude || 'none'}
- Prioritize user pantry ingredients where natural: ${userIngs.length > 0 ? userIngs.join(', ') : 'Healthy whole food ingredients'}
- Calorie target per recipe: approximately ${calTarget} kcal.

CRITICAL RULES:
1. Each recipe must be an authentic, real meal (e.g. "Honey Garlic Glazed Salmon with Steamed Broccoli", "Creamy Tuscan Garlic Chicken", "Chickpea & Spinach Coconut Curry").
2. Each recipe MUST include 7 to 12 realistic culinary ingredients (include oils, seasonings, aromatics, garlic, herbs, vegetables, and mains) with realistic numeric amounts and units (e.g. g, tbsp, cup, cloves, tsp).
3. Each recipe MUST have 5 to 8 clear, realistic step-by-step cooking instructions.

Return strictly JSON format:
{
  "recipes": [
    {
      "id": 1001,
      "title": "Recipe Title",
      "readyInMinutes": 25,
      "calories": 620,
      "ingredients": [
        { "name": "chicken breast", "amount": 250, "unit": "g" },
        { "name": "olive oil", "amount": 1, "unit": "tbsp" },
        { "name": "garlic cloves", "amount": 3, "unit": "cloves" }
      ],
      "steps": [
        { "number": 1, "step": "Pat the chicken breasts dry..." }
      ]
    }
  ]
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      console.warn('[Groq Recipe Gen Error]:', await res.text());
      return null;
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed.recipes) || parsed.recipes.length === 0) return null;

    return parsed.recipes.map((r: any, idx: number) => ({
      id: r.id || Math.floor(Math.random() * 90000) + 10000,
      title: r.title,
      type: 'Dinner',
      image: pickRecipeImage(r.title),
      readyInMinutes: r.readyInMinutes || 25,
      calories: Math.round(r.calories || calTarget),
      ingredients: Array.isArray(r.ingredients) && r.ingredients.length > 0
        ? r.ingredients.map((ing: any) => ({
            name: String(ing.name || ''),
            amount: typeof ing.amount === 'number' ? Math.round(ing.amount * 10) / 10 : 1,
            unit: String(ing.unit || ''),
          }))
        : CURATED_RECIPES[idx % CURATED_RECIPES.length].ingredients,
      steps: Array.isArray(r.steps) && r.steps.length > 0
        ? r.steps.map((st: any, sIdx: number) => ({
            number: st.number || sIdx + 1,
            step: String(st.step || ''),
          }))
        : CURATED_RECIPES[idx % CURATED_RECIPES.length].steps,
    }));
  } catch (err) {
    console.warn('[Groq Recipe Gen Exception]:', err);
    return null;
  }
}

/**
 * Fetches real recipes from Spoonacular API if available.
 */
async function fetchFromSpoonacular(
  apiKey: string,
  cookDays: number,
  diet: string,
  exclude: string,
  userIngs: string[],
  calTarget: number
): Promise<RecipeMeal[] | null> {
  try {
    let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&type=main%20course&addRecipeInformation=true&fillIngredients=true&instructionsRequired=true&number=${cookDays * 2}`;
    if (diet) url += `&diet=${diet}`;
    if (exclude) url += `&intolerances=${exclude}`;
    if (userIngs.length > 0) {
      url += `&includeIngredients=${encodeURIComponent(userIngs.slice(0, 5).join(','))}`;
    }

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return null;

    const validRecipes = data.results.filter(
      (r: any) => Array.isArray(r.extendedIngredients) && r.extendedIngredients.length >= 4
    );

    if (validRecipes.length < cookDays) return null;

    return validRecipes.map((r: any) => {
      const cal = r.nutrition?.nutrients?.find((n: any) => n.name === 'Calories');
      const steps = r.analyzedInstructions?.[0]?.steps?.map((s: any) => ({
        number: s.number,
        step: s.step,
      })) || [];

      return {
        id: r.id,
        title: r.title,
        type: 'Dinner',
        image: r.image || pickRecipeImage(r.title),
        readyInMinutes: r.readyInMinutes || 25,
        calories: cal?.amount ? Math.round(cal.amount) : calTarget,
        ingredients: r.extendedIngredients.map((ing: any) => ({
          name: ing.name,
          amount: Math.round(ing.amount * 10) / 10,
          unit: ing.unit || '',
        })),
        steps: steps.length > 0 ? steps : [
          { number: 1, step: 'Gather and prepare all ingredients.' },
          { number: 2, step: 'Follow standard preparation and cook over medium heat until done.' },
          { number: 3, step: 'Season to taste and serve warm.' }
        ],
      };
    });
  } catch (err) {
    console.warn('[Spoonacular fetch error]:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetCalories = parseInt(searchParams.get('targetCalories') || '2000', 10);
    const diet = searchParams.get('diet') || '';
    const exclude = searchParams.get('exclude') || '';
    const ingredientsStr = searchParams.get('ingredients') || '';
    const cookDays = Math.min(7, Math.max(2, parseInt(searchParams.get('cookDays') || '7', 10)));
    
    // User's base generation date (defaults to current server/client date)
    const startDateParam = searchParams.get('startDate');
    const baseDate = startDateParam ? new Date(startDateParam) : new Date();

    const calPerMeal = Math.round(targetCalories * 0.6); // Single main meal of the day
    const userIngs = ingredientsStr
      ? ingredientsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // 1. Compute schedule starting on baseDate (Day 0 is always Today)
    const schedule = computeCookingSchedule(cookDays, baseDate);

    // 2. Fetch real recipes
    let allRecipes: RecipeMeal[] | null = null;
    const spoonKey = process.env.SPOONACULAR_API_KEY;

    // Try Spoonacular
    if (spoonKey) {
      allRecipes = await fetchFromSpoonacular(spoonKey, cookDays, diet, exclude, userIngs, calPerMeal);
    }

    // Try Groq AI if Spoonacular returned null or not enough recipes
    if (!allRecipes || allRecipes.length < cookDays) {
      const groqNeeded = cookDays + 3; // Needed for days + swap pool
      allRecipes = await generateRecipesWithGroq(groqNeeded, diet, exclude, userIngs, calPerMeal);
    }

    // Fallback to rich curated recipes if both external APIs are unavailable
    if (!allRecipes || allRecipes.length === 0) {
      allRecipes = [...CURATED_RECIPES];
    }

    // Ensure we have enough recipes by repeating pool if necessary
    while (allRecipes.length < cookDays + 3) {
      allRecipes.push(...allRecipes.slice(0, cookDays + 3 - allRecipes.length));
    }

    // 3. Assemble Days with Schedule
    const days = schedule.map(({ dayName, eatOn }, di) => {
      const meal = allRecipes![di];
      return {
        day: dayName,
        eatOn,
        meals: [meal],
        nutrients: { calories: meal.calories },
      };
    });

    // 4. Extras pool for swapping recipes
    const extras: Record<string, RecipeMeal[]> = {
      dinner: allRecipes.slice(cookDays).map((r) => ({ ...r, type: 'Dinner' })),
    };

    return NextResponse.json({ days, extras });
  } catch (err) {
    console.error('[API /recipes] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Unable to generate meal plan. Please try again.' },
      { status: 500 }
    );
  }
}
