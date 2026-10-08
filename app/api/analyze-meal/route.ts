import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getProfile } from '@/lib/data'

export const maxDuration = 60

const requestSchema = z.object({
  description: z.string().max(2000).default(''),
  image: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp);base64,/)
    .max(6_000_000)
    .nullable()
    .default(null),
})

const mealSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        estimatedGrams: z.number(),
        carbs: z.number(),
        protein: z.number(),
        fat: z.number(),
        sugar: z.number(),
      }),
    )
    .describe('Each identified food item with its macronutrients in grams'),
  totals: z.object({
    carbs: z.number(),
    protein: z.number(),
    fat: z.number(),
    sugar: z.number(),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
  notes: z.string().describe('One or two short sentences on assumptions made'),
})

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
  const { description, image } = parsed.data
  if (!description.trim() && !image) {
    return Response.json({ error: 'Add a photo or a description' }, { status: 400 })
  }

  try {
    const profile = await getProfile()
    const system =
      'You are a clinical nutrition estimator supporting a person with Type 1 diabetes. Estimate macronutrients in grams (carbohydrates, protein, fat, and sugars as a subset of carbs). Sugar is included within total carbohydrates, never added on top of carbs. Each item and the totals must satisfy 0 <= sugar <= carbs. When the user states weights, trust them over visual estimates. Use standard food composition data (cooked weights unless stated). Be conservative and never invent foods that are not described or visible. Totals must equal the sum of items. Return only valid JSON matching this shape: {"items":[{"name":"string","estimatedGrams":0,"carbs":0,"protein":0,"fat":0,"sugar":0}],"totals":{"carbs":0,"protein":0,"fat":0,"sugar":0},"confidence":"low|medium|high","notes":"string"}.'
    const content = [
      {
        type: 'text' as const,
        text: description.trim() ? `Meal description: ${description.trim()}` : 'No description provided. Estimate from the photo.',
      },
      ...(image ? [{ type: 'image_url' as const, image_url: { url: image } }] : []),
    ]

    if (!profile?.aiApiKey || !profile.aiModel || !profile.aiBaseUrl) {
      return Response.json(
        {
          error: 'AI provider settings are required before meal estimation.',
          errorCode: 'AI_PROVIDER_NOT_CONFIGURED',
          status: 400,
        },
        { status: 400 },
      )
    }

    {
      const response = await fetch(`${profile.aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.aiApiKey}` },
        body: JSON.stringify({ model: profile.aiModel, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
      })
      if (!response.ok) {
        const error = new Error(`Custom AI provider returned HTTP ${response.status}`) as Error & { status: number; code: string }
        error.status = response.status
        error.code = `PROVIDER_HTTP_${response.status}`
        throw error
      }
      const json = await response.json()
      const raw = json.choices?.[0]?.message?.content
      const output = mealSchema.parse(JSON.parse(typeof raw === 'string' ? raw.replace(/^```json\\s*|\\s*```$/g, '') : raw))
      return Response.json(output)
    }

    const { output } = await generateText({
      model: 'google/gemini-3.8-flash',
      output: Output.object({ schema: mealSchema }),
      system,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: description.trim()
                ? `Meal description: ${description.trim()}`
                : 'No description provided. Estimate from the photo.',
            },
            ...(image ? [{ type: 'image' as const, image: image as string }] : []),
          ],
        },
      ],
    })
    return Response.json(output)
  } catch (error) {
    console.error('[analyze-meal]', error)
    const details = error as {
      status?: number
      statusCode?: number
      code?: string
      responseBody?: string
      cause?: { status?: number; statusCode?: number; code?: string }
    }
    const status = details.status ?? details.statusCode ?? details.cause?.status ?? details.cause?.statusCode ?? 500
    const errorCode = details.code ?? details.cause?.code ?? `HTTP_${status}`
    return Response.json(
      {
        error: 'Could not analyze this meal. Please try again.',
        errorCode,
        status,
      },
      { status: status >= 400 && status <= 599 ? status : 500 },
    )
  }
}
