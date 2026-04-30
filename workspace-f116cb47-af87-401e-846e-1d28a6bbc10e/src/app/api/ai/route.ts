import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-utils'

type AIAction =
  | 'improve'
  | 'shorten'
  | 'lengthen'
  | 'fixGrammar'
  | 'translate'
  | 'generatePlan'
  | 'summarize'
  | 'chat'

const VALID_ACTIONS: AIAction[] = [
  'improve',
  'shorten',
  'lengthen',
  'fixGrammar',
  'translate',
  'generatePlan',
  'summarize',
  'chat',
]

function buildSystemPrompt(action: AIAction, context?: string): string {
  const base = 'You are NexusAI, a helpful writing and productivity assistant.'
  const ctx = context ? ` Context: ${context}` : ''

  switch (action) {
    case 'improve':
      return `${base} Improve the clarity, tone, and quality of the provided text while preserving its meaning.${ctx}`
    case 'shorten':
      return `${base} Shorten the provided text significantly while preserving the key information.${ctx}`
    case 'lengthen':
      return `${base} Expand the provided text with more detail, examples, and elaboration.${ctx}`
    case 'fixGrammar':
      return `${base} Fix all grammar, spelling, and punctuation errors in the provided text.${ctx}`
    case 'translate':
      return `${base} Translate the provided text to English (or if already English, to Spanish). Provide only the translation.${ctx}`
    case 'generatePlan':
      return `${base} Generate a structured action plan based on the provided topic or goal. Use numbered steps.${ctx}`
    case 'summarize':
      return `${base} Summarize the provided text in 2-3 concise sentences.${ctx}`
    case 'chat':
      return `${base} Answer the user's question helpfully and concisely.${ctx}`
    default:
      return base
  }
}

function generateMockResponse(action: AIAction, content: string): string {
  switch (action) {
    case 'improve':
      return `${content.trim()} [Enhanced for clarity and impact with improved sentence structure and more precise language.]`

    case 'shorten': {
      const words = content.trim().split(/\s+/)
      const shortened = words.slice(0, Math.max(Math.floor(words.length / 2), 5)).join(' ')
      return shortened + (words.length > 5 ? '...' : '')
    }

    case 'lengthen':
      return (
        content.trim() +
        '\n\nTo elaborate further: this concept is particularly important in modern workflows ' +
        'because it enables teams to work more effectively and with greater clarity. ' +
        'By focusing on the key principles outlined above, organizations can achieve ' +
        'measurable improvements in both productivity and collaboration quality.'
      )

    case 'fixGrammar':
      // Simple mock — capitalize first letter, ensure sentence ends with period
      return (
        content.trim().charAt(0).toUpperCase() +
        content.trim().slice(1) +
        (content.trim().endsWith('.') ||
        content.trim().endsWith('!') ||
        content.trim().endsWith('?')
          ? ''
          : '.')
      )

    case 'translate':
      return `[Translation of: "${content.trim().substring(0, 60)}${content.length > 60 ? '...' : ''}"]\n\nEste es un marcador de posición de traducción. Conecte una clave API de OpenAI para obtener traducciones reales.`

    case 'generatePlan': {
      const topic = content.trim() || 'your goal'
      return `Action Plan: ${topic}\n\n1. Define clear objectives and success metrics\n2. Identify key stakeholders and resources needed\n3. Break down the project into manageable milestones\n4. Assign responsibilities and set deadlines for each milestone\n5. Establish a communication cadence (daily standups / weekly reviews)\n6. Implement tracking tools to monitor progress\n7. Schedule a mid-point review to assess and adjust the plan\n8. Conduct a final retrospective and document lessons learned`
    }

    case 'summarize': {
      const words = content.trim().split(/\s+/)
      if (words.length <= 30) return content.trim()
      const preview = words.slice(0, 15).join(' ')
      return `This content covers: ${preview}... [Auto-generated summary — connect OpenAI API for full AI summarization.]`
    }

    case 'chat':
      return `I understand you're asking about: "${content.trim().substring(0, 80)}${content.length > 80 ? '...' : ''}"\n\nThis is a demo response. To enable full AI chat functionality, please add your OPENAI_API_KEY to the environment variables.`

    default:
      return content
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, content, context } = body as Record<string, unknown>

  if (!action || typeof action !== 'string') {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }
  if (!VALID_ACTIONS.includes(action as AIAction)) {
    return NextResponse.json(
      {
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      },
      { status: 400 },
    )
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const typedAction = action as AIAction
  const contextStr = typeof context === 'string' ? context : undefined

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Return smart mock response
    const result = generateMockResponse(typedAction, content)
    return NextResponse.json({ result, mock: true })
  }

  // --- Real OpenAI call ---
  const systemPrompt = buildSystemPrompt(typedAction, contextStr)

  let openAIResponse: Response
  try {
    openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content.trim() },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach OpenAI API' },
      { status: 502 },
    )
  }

  if (!openAIResponse.ok) {
    let errBody: unknown
    try {
      errBody = await openAIResponse.json()
    } catch {
      errBody = null
    }
    const message =
      errBody &&
      typeof errBody === 'object' &&
      'error' in errBody &&
      errBody.error &&
      typeof errBody.error === 'object' &&
      'message' in errBody.error
        ? (errBody.error as { message: string }).message
        : `OpenAI API error: ${openAIResponse.status}`
    return NextResponse.json({ error: message }, { status: 502 })
  }

  let data: unknown
  try {
    data = await openAIResponse.json()
  } catch {
    return NextResponse.json({ error: 'Failed to parse OpenAI response' }, { status: 502 })
  }

  const result =
    data &&
    typeof data === 'object' &&
    'choices' in data &&
    Array.isArray((data as { choices: unknown[] }).choices) &&
    (data as { choices: { message?: { content?: string } }[] }).choices[0]?.message?.content

  if (!result) {
    return NextResponse.json({ error: 'No result from OpenAI' }, { status: 502 })
  }

  return NextResponse.json({ result })
}
