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
You are an expert culinary parser for the PrepBite meal prep app.
Your job is to take raw user grocery/pantry items and distinguish:
1. Base Whole Ingredients (e.g., "Tomato", "Potato", "Raw Milk", "Chicken")
2. Processed Condiments & Sauces (e.g., "Tomato Ketchup", "Tomato Paste", "Mayonnaise", "Soy Sauce")
3. Standardized Name for Spoonacular Search (a comma-separated string of the base ingredients, optionally simplified, e.g. "tomato, potato, milk, chicken").

User Ingredients: ${JSON.stringify(ingredients)}

Return ONLY a clean JSON object with the following schema:
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
        model: 'llama3-8b-8192',
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
