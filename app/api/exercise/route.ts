import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ExerciseType } from "@/lib/curriculum";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ExerciseRequest {
  skillId: string;
  cardSeed: string;
  grammarPoint: string;
  exerciseType: ExerciseType;
  isLeahSkill: boolean;
}

interface ExerciseResponse {
  type: ExerciseType;
  prompt: string;
  hint?: string;
  options?: string[];
  answer: string;
  explanation: string;
}

const LEAH_CONTEXT = `
IMPORTANT LEARNER CONTEXT — use these real details for exercises in this skill:
- Leah lives in Culver City, Los Angeles ("Asun Culver Cityssä, Los Angelesissa")
- She lives with Oskari ("Asun Oskarin kanssa")
- They have two cats named Kiki and Karl ("Meillä on kaksi kissaa, Kiki ja Karl")
- Leah is a data analyst ("Olen data-analyytikko")
- She works in renewable energy ("Työskentelen uusiutuvan energian alalla")
- She studied math at university ("Opiskelin matematiikkaa yliopistossa")
- She speaks a little Finnish ("Puhun vähän suomea")
- She is American ("Olen amerikkalainen")
- She is Oskari's girlfriend, visiting his family in Finland in July 2026
- Exercises in this skill should be 70% EN→FI production (sentences she'll actually say)
- Explanations can reference that these are real sentences she'll use with Oskari's family
`;

function buildSystemPrompt(isLeahSkill: boolean): string {
  return `You are a Finnish language tutor for an English speaker named Leah. She has completed Duolingo Finnish and is at an intermediate post-Duolingo level. She is preparing for a real trip to Finland in July 2026 to meet her Finnish partner Oskari's family.

${isLeahSkill ? LEAH_CONTEXT : ""}

EXERCISE GENERATION RULES:
1. Pitch difficulty at post-Duolingo intermediate level — she knows basics, push her further
2. Grammar explanations MUST explain WHY the rule exists, not just what is correct
3. Note colloquial vs formal variants where relevant (e.g. "Oskari's family would say mulla on rather than minulla on")
4. For production exercises: accept minor spelling variations as correct if phonetically close (case insensitive, trim whitespace)
5. Explanations should feel like a knowledgeable friend, not a textbook. Be warm and encouraging.
6. For correct answers use tone like: "Exactly right! The partitive 'kissaa' is needed here because..."
7. For wrong answers use tone like: "Close! You used X but Y is needed here because..."
8. Every exercise MUST have a grammar explanation — never skip it

EXERCISE TYPE SPECS:
- recognition: Finnish word/phrase → choose English meaning (4 options). Return options array.
- production: English phrase → type in Finnish. No options. Hint optional.
- case_ending: Fill in the correct case ending (show the stem with ___). Return the full word as answer.
- odd_one_out: 4 Finnish words, one doesn't belong. Return options array (the 4 words). Answer = the odd one + why.
- conversation: Short 2-line Finnish dialogue → comprehension question in English. Return options array (4 English answers).
- fix_the_mistake: Show a Finnish sentence with one error. Answer = the corrected sentence.
- family_vocab: Finnish family term → English meaning (4 options). Return options array.

Respond with ONLY valid JSON in this exact shape — no markdown, no code blocks, just raw JSON:
{
  "type": "...",
  "prompt": "...",
  "hint": "...",
  "options": ["...", "...", "...", "..."],
  "answer": "...",
  "explanation": "..."
}

Omit "hint" if not applicable. Omit "options" for production and fix_the_mistake types.`;
}

function buildUserPrompt(req: ExerciseRequest): string {
  return `Generate a ${req.exerciseType} exercise for Finnish skill: ${req.skillId}

Topic: ${req.cardSeed}
Grammar focus: ${req.grammarPoint}
Exercise type: ${req.exerciseType}

Make it feel authentic and relevant to real conversation. The exercise should be varied and interesting — not a textbook example.`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ExerciseRequest;

    if (!body.skillId || !body.cardSeed || !body.exerciseType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: buildSystemPrompt(body.isLeahSkill),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(body),
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No text response from AI" }, { status: 500 });
    }

    let parsed: ExerciseResponse;
    try {
      parsed = JSON.parse(textContent.text) as ExerciseResponse;
    } catch {
      // Try to extract JSON from response
      const match = textContent.text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
      }
      parsed = JSON.parse(match[0]) as ExerciseResponse;
    }

    if (!parsed.prompt || !parsed.answer || !parsed.explanation) {
      return NextResponse.json({ error: "Incomplete AI response" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Exercise API error:", error);
    return NextResponse.json({ error: "Failed to generate exercise" }, { status: 500 });
  }
}
