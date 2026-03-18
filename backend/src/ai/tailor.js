import { getDb } from '../db/schema.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

function getSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

function buildPrompt(job, profile, baseTex) {
  const profileData = {
    name: profile.name,
    summary: profile.summary,
    experience: JSON.parse(profile.experience || '[]'),
    education: JSON.parse(profile.education || '[]'),
    skills: JSON.parse(profile.skills || '[]'),
    target_titles: JSON.parse(profile.target_titles || '[]'),
  };

  return `You are an expert resume writer. Your task is to tailor the provided LaTeX resume for a specific job.

IMPORTANT RULES:
- Only reorder, emphasize, and reword existing experience bullets. NEVER fabricate experience, skills, or achievements.
- Adjust the professional summary to align with the job description.
- Reorder skills to put the most relevant ones first.
- Keep the LaTeX structure and formatting intact. Only change text content, not structure.
- Return ONLY the complete LaTeX source code, no explanations or markdown code fences.

JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Job Description:
${job.description || 'No description available'}

CANDIDATE PROFILE:
${JSON.stringify(profileData, null, 2)}

BASE LATEX RESUME:
${baseTex}

Return the tailored LaTeX resume source code only:`;
}

export async function tailorResume({ job, profile, baseTex }) {
  const settings = getSettings();
  const provider = settings.ai_provider || 'openai';
  const model = settings.ai_model || 'gpt-4o';
  const prompt = buildPrompt(job, profile, baseTex);

  if (provider === 'openai') {
    const apiKey = settings.openai_api_key;
    if (!apiKey) throw new Error('OpenAI API key not configured in Settings');

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
    });
    return response.choices[0].message.content.trim();
  }

  if (provider === 'anthropic') {
    const apiKey = settings.anthropic_api_key;
    if (!apiKey) throw new Error('Anthropic API key not configured in Settings');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].text.trim();
  }

  if (provider === 'ollama') {
    const baseUrl = settings.ollama_base_url || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    return data.response.trim();
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}
