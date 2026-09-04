import { NextRequest, NextResponse } from 'next/server';
import { parseIngredientsWithGroq } from '../../../lib/ingredientParser';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const COOKING_METHODS = {
  breakfast: ['Scramble', 'Toast', 'Bowl', 'Smoothie', 'Pancakes', 'Wrap', 'Porridge'],
  lunch: ['Salad', 'Wrap', 'Bowl', 'Sandwich', 'Stir-Fry', 'Soup', 'Pasta'],
  dinner: ['Stir-Fry', 'Roast', 'Curry', 'Pasta', 'Bowl', 'Casserole', 'Skillet'],
};

const METHOD_IMAGES: Record<string, string> = {
  Scramble: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=300&q=80',
  Toast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&q=80',
  Bowl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&q=80',
  Smoothie: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=300&q=80',
  Pancakes: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&q=80',
  Salad: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
  Wrap: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80',
  Sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&q=80',
  'Stir-Fry': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&q=80',
  Soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=80',
  Pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281270?w=300&q=80',
  Roast: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&q=80',
  Curry: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&q=80',
  Casserole: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&q=80',
  Skillet: 'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?w=300&q=80',
  Porridge: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=300&q=80',
};

const METHOD_STEPS: Record<string, string> = {
  Scramble: 'Heat butter in a pan and scramble everything together until cooked through.',
  Toast: 'Toast bread until golden, then layer your prepared ingredients on top.',
  Bowl: 'Combine all ingredients in a bowl and drizzle with your favorite dressing.',
  Smoothie: 'Blend all ingredients with some ice and liquid until smooth.',
  Pancakes: 'Mix ingredients into a batter, then cook on a griddle until golden on both sides.',
  Salad: 'Toss all ingredients together in a large bowl with olive oil and lemon juice.',
  Wrap: 'Place ingredients in a tortilla and wrap tightly.',
  Sandwich: 'Layer ingredients between slices of bread with your choice of condiment.',
  'Stir-Fry': 'Heat oil in a wok or pan and stir-fry ingredients on high heat for 5-7 minutes.',
  Soup: 'Simmer all ingredients in broth for 15-20 minutes until tender.',
  Pasta: 'Cook pasta al dente, then toss with sautéed ingredients and sauce.',
  Roast: 'Roast ingredients in a preheated oven at 200°C (400°F) for 20-25 minutes.',
  Curry: 'Cook ingredients in a curry sauce with coconut milk for 15 minutes.',
  Casserole: 'Layer ingredients in a baking dish and bake at 190°C (375°F) for 25 minutes.',
  Skillet: 'Cook everything together in a cast-iron skillet until golden and crispy.',
  Porridge: 'Simmer with water or milk until thick and creamy, about 5-8 minutes.',
};

const MEAT_WORDS = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'shrimp', 'turkey', 'bacon', 'sausage', 'ham', 'tuna', 'prawn'];
const DAIRY_WORDS = ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ghee', 'paneer', 'whey'];
const ANIMAL_WORDS = [...MEAT_WORDS, ...DAIRY_WORDS, 'egg', 'honey'];

function filterIngredientsByDiet(ings: string[], diet: string, exclude: string): string[] {
  let filtered = [...ings];
  if (diet === 'vegetarian' || diet === 'vegan') filtered = filtered.filter(i => !MEAT_WORDS.some(m => i.toLowerCase().includes(m)));
  if (diet === 'vegan') filtered = filtered.filter(i => !ANIMAL_WORDS.some(a => i.toLowerCase().includes(a)));
  if (exclude === 'dairy') filtered = filtered.filter(i => !DAIRY_WORDS.some(d => i.toLowerCase().includes(d)));
  return filtered;
}

function generateRecipe(ings: string[], mealType: 'breakfast' | 'lunch' | 'dinner', methodIdx: number, calTarget: number) {
  const methods = COOKING_METHODS[mealType];
  const method = methods[methodIdx % methods.length];
  const picked = ings.slice(0, Math.min(3, ings.length));
  const title = picked.length > 1 ? `${picked[0]} & ${picked[1]} ${method}` : `${picked[0]} ${method}`;
  const image = METHOD_IMAGES[method] || METHOD_IMAGES.Bowl;

  const steps = [
    { number: 1, step: `Gather and prepare your ingredients: ${picked.join(', ')}.` },
    { number: 2, step: `Wash and chop ${picked[0]} into bite-sized pieces.` },
  ];
  if (picked.length > 1) steps.push({ number: 3, step: `Prepare ${picked.slice(1).join(' and ')} by slicing or dicing as needed.` });
  steps.push({ number: steps.length + 1, step: METHOD_STEPS[method] || 'Cook everything together until done.' });
  steps.push({ number: steps.length + 1, step: 'Season with salt and pepper to taste. Serve and enjoy!' });

  return {
    id: Math.floor(Math.random() * 100000),
    title, image,
    readyInMinutes: 10 + Math.floor(Math.random() * 20),
    calories: Math.round(calTarget + (Math.random() * 80 - 40)),
    ingredients: picked.map(name => ({ name, amount: 1, unit: 'serving' })),
    steps,
  };
}

export async function GET(req: NextRequest) {
  try {
  const { searchParams } = new URL(req.url);
  const targetCalories = parseInt(searchParams.get('targetCalories') || '2000', 10);
  const diet = searchParams.get('diet') || '';
  const exclude = searchParams.get('exclude') || '';
  const ingredientsStr = searchParams.get('ingredients') || '';
  const apiKey = process.env.SPOONACULAR_API_KEY;

  const defaultIngs = diet === 'vegan'
    ? ['Rice', 'Potato', 'Broccoli', 'Tomato', 'Spinach', 'Bean', 'Lentil', 'Mushroom', 'Corn', 'Avocado']
    : diet === 'vegetarian'
    ? ['Rice', 'Egg', 'Potato', 'Cheese', 'Tomato', 'Spinach', 'Bean', 'Mushroom', 'Bread', 'Pasta']
    : ['Rice', 'Egg', 'Bread', 'Chicken', 'Potato', 'Tomato', 'Lettuce', 'Cheese', 'Pasta', 'Onion'];

  let userIngs = ingredientsStr ? ingredientsStr.split(',').map(s => s.trim()).filter(Boolean) : defaultIngs;
  userIngs = filterIngredientsByDiet(userIngs, diet, exclude);
  if (userIngs.length === 0) userIngs = filterIngredientsByDiet(defaultIngs, diet, exclude);
  if (userIngs.length === 0) userIngs = ['Rice', 'Potato', 'Tomato', 'Spinach', 'Bean'];

  // Try Spoonacular first
  let apiSuccess = false;
  if (apiKey && ingredientsStr.trim()) {
    try {
      const parsed = await parseIngredientsWithGroq(userIngs);
      const findUrl = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${apiKey}&ingredients=${encodeURIComponent(parsed.searchString)}&number=42&ranking=1&ignorePantry=false`;
      const findRes = await fetch(findUrl);
      if (findRes.ok) {
        const found = await findRes.json();
        if (Array.isArray(found) && found.length > 0) {
          const ids = found.map((r: any) => r.id);
          const bulkRes = await fetch(`https://api.spoonacular.com/recipes/informationBulk?apiKey=${apiKey}&ids=${ids.join(',')}&includeNutrition=true`);
          if (bulkRes.ok) {
            let recipes = await bulkRes.json();
            if (diet === 'vegetarian') recipes = recipes.filter((r: any) => r.vegetarian);
            else if (diet === 'vegan') recipes = recipes.filter((r: any) => r.vegan);
            if (exclude === 'dairy') recipes = recipes.filter((r: any) => r.dairyFree);

            if (recipes.length >= 3) {
              while (recipes.length < 42) recipes.push(...recipes.slice(0, 42 - recipes.length));
              const mainRecipes = recipes.slice(0, 21);
              const extraRecipes = recipes.slice(21, 42);
              const BASE_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const todayIdx = new Date().getDay();
              const dayNames = Array.from({length: 7}, (_, i) => BASE_DAYS[(todayIdx + i) % 7]);
              const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
              const calPerMeal = Math.round(targetCalories / 3);

              const days = dayNames.map((day, di) => {
                const meals = mealTypes.map((type, mi) => {
                  const r = mainRecipes[di * 3 + mi];
                  const cal = r.nutrition?.nutrients?.find((n: any) => n.name === 'Calories');
                  return {
                    type, id: r.id, title: r.title, image: r.image,
                    readyInMinutes: r.readyInMinutes || 15,
                    calories: cal?.amount || calPerMeal,
                    ingredients: r.extendedIngredients?.map((ing: any) => ({ name: ing.name, amount: Math.round(ing.amount * 10) / 10, unit: ing.unit })) || [],
                    steps: r.analyzedInstructions?.[0]?.steps?.map((s: any) => ({ number: s.number, step: s.step })) || [],
                  };
                });
                return { day, meals, nutrients: { calories: meals.reduce((s, m) => s + m.calories, 0) } };
              });

              // Generate extras for refresh
              const extras: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
              extraRecipes.forEach((r: any, i: number) => {
                const type = mealTypes[i % 3];
                const key = type.toLowerCase();
                const cal = r.nutrition?.nutrients?.find((n: any) => n.name === 'Calories');
                extras[key].push({
                  type, id: r.id, title: r.title, image: r.image,
                  readyInMinutes: r.readyInMinutes || 15,
                  calories: cal?.amount || calPerMeal,
                  ingredients: r.extendedIngredients?.map((ing: any) => ({ name: ing.name, amount: Math.round(ing.amount * 10) / 10, unit: ing.unit })) || [],
                  steps: r.analyzedInstructions?.[0]?.steps?.map((s: any) => ({ number: s.number, step: s.step })) || [],
                });
              });
              
              return NextResponse.json({ days, extras });
            }
          }
        }
      }
    } catch (e) { console.warn('Spoonacular fallback:', e); }
  }

  // ---- Generate recipes from user ingredients ----
  const shuffled = [...userIngs].sort(() => Math.random() - 0.5);
  const calPerMeal = Math.round(targetCalories / 3);
  const BASE_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const dayNames = Array.from({length: 7}, (_, i) => BASE_DAYS[(todayIdx + i) % 7]);
  const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];

  const days = dayNames.map((day, di) => {
    const meals = mealTypes.map((type, mi) => {
      const start = (di * 5 + mi * 3) % shuffled.length;
      const mealIngs: string[] = [];
      for (let k = 0; k < 3; k++) mealIngs.push(shuffled[(start + k) % shuffled.length]);
      const r = generateRecipe(mealIngs, type, di + mi, calPerMeal);
      return { type: type.charAt(0).toUpperCase() + type.slice(1), ...r };
    });
    return { day, meals, nutrients: { calories: meals.reduce((s, m) => s + m.calories, 0) } };
  });

  // Generate extras per category for refresh
  const extras: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
  mealTypes.forEach(type => {
    for (let i = 0; i < 7; i++) {
      const start = (21 + i * 4) % shuffled.length;
      const mealIngs: string[] = [];
      for (let k = 0; k < 3; k++) mealIngs.push(shuffled[(start + k) % shuffled.length]);
      extras[type].push({ type: type.charAt(0).toUpperCase() + type.slice(1), ...generateRecipe(mealIngs, type, 10 + i, calPerMeal) });
    }
  });

  return NextResponse.json({ days, extras });

  } catch (err) {
    console.error('[API /recipes] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Unable to generate meal plan. Please try again.' },
      { status: 500 }
    );
  }
}
