export interface ParsedIngredients {
  baseIngredients: string[];
  condiments: string[];
  searchString: string;
}

export async function parseIngredientsWithGroq(ingredients: string[]): Promise<ParsedIngredients> {
  const apiKey = process.env.GROQ_API_KEY;
  const fallback = { baseIngredients: ingredients, condiments: [], searchString: ingredients.join(', ') };
  
  if (!apiKey || ingredients.length === 0) return fallback;

  try {
    const prompt = `
You are an expert culinary ingredient parser for the PrepBite meal prep app.
Given a list of user-provided grocery or pantry items, classify each into:

1. "baseIngredients": Raw, whole ingredients suitable for cooking recipes (e.g., "Tomato", "Chicken Breast", "Rice", "Spinach", "Eggs", "Raw Milk").
2. "condiments": Processed sauces, seasonings, spreads, or pre-made items (e.g., "Tomato Ketchup", "Soy Sauce", "Mayonnaise", "Peanut Butter").
3. "searchString": A comma-separated string of ONLY the base ingredients, normalized to simple singular names for Spoonacular API search (e.g., "tomato, chicken, rice, spinach, egg, milk"). Remove brand names, quantities, and unnecessary modifiers.

IMPORTANT RULES:
- If an item is ambiguous, lean towards "baseIngredients".
- Fix obvious misspellings (e.g., "tomatoe" → "Tomato", "chiken" → "Chicken").
- Normalize plural to singular (e.g., "Eggs" → "egg" in searchString).
- Do NOT include condiments in the searchString.
- Every input item must appear in EXACTLY one of baseIngredients or condiments.

User Ingredients: ${JSON.stringify(ingredients)}

Return ONLY a clean JSON object:
{
  "baseIngredients": ["string"],
  "condiments": ["string"],
  "searchString": "string"
}
`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error('Groq API Error:', await res.text());
      return fallback;
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content);
      return {
        baseIngredients: Array.isArray(parsed.baseIngredients) ? parsed.baseIngredients : ingredients,
        condiments: Array.isArray(parsed.condiments) ? parsed.condiments : [],
        searchString: typeof parsed.searchString === 'string' ? parsed.searchString : ingredients.join(','),
      };
    }
  } catch (error) {
    console.error('Failed to parse ingredients with Groq:', error);
  }

  return fallback;
}
