import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { filename, contentType, title } = await req.json()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are a content marketplace specialist. Generate metadata for a digital asset.

File: "${filename}"
Content type: ${contentType}
Title hint: "${title}"

Return a JSON object with:
- description: 2-3 sentence compelling description for creators browsing a marketplace (max 200 chars)
- tags: array of 6-10 relevant lowercase tags
- suggestedPrice: suggested USD price as a number (0 for free, otherwise 4.99/9.99/19.99/29.99/49.99)

Only return valid JSON, no other text.`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ description: '', tags: [], suggestedPrice: 0 })
  }
}
