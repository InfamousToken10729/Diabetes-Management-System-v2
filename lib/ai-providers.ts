export type AiProviderId = 'gemini' | 'groq' | 'openrouter'

export type AiProvider = {
  label: string
  baseUrl: string
  models: string[]
}

// Developer-maintained catalog. Add or remove models here as provider offerings change.
export const AI_PROVIDERS: Record<AiProviderId, AiProvider> = {
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b'],
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o-mini', 'deepseek/deepseek-chat-v3-0324', 'google/gemini-2.5-flash'],
  },
}

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[]

export function modelsForProvider(provider: string) {
  return AI_PROVIDERS[provider as AiProviderId]?.models ?? []
}

export function providerForBaseUrl(baseUrl: string | null | undefined): AiProviderId {
  if (baseUrl?.includes('groq')) return 'groq'
  if (baseUrl?.includes('openrouter')) return 'openrouter'
  return 'gemini'
}

export function isKnownProviderModel(provider: string, model: string | null | undefined) {
  return Boolean(model && modelsForProvider(provider).includes(model))
}

export const MANUAL_MODEL_VALUE = '__manual__'
