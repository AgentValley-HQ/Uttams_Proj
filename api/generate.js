import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function firstSentence(s) {
  const m = String(s).match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : String(s)).trim();
}

function fixHeadings(text, picks) {
  const titles = picks.map((p) => p.title);
  let n = 0;
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*\d+\.\s*)(.+)$/);
      if (!m) return line;
      const title = titles[n++];
      return title ? m[1] + title : line;
    })
    .join('\n');
}

function trimPost(text, picks) {
  text = fixHeadings(text, picks);
  const lines = text.split('\n');
  let afterPoint = false;
  const out = lines.map((line) => {
    if (/^\s*\d+\.\s/.test(line)) {
      afterPoint = true;
      return line;
    }
    if (afterPoint && line.trim()) {
      afterPoint = false;
      return firstSentence(line);
    }
    afterPoint = false;
    return line;
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildPrompt({ host, session, community, picks, custom }) {
  const pickLines = picks.map((p) => `- ${p.title}: ${p.detail}`).join('\n');
  const customBlock = custom
    ? `Their own words  this is the backbone of the post. Rewrite and expand it, keep their meaning, angle and any specifics; never paste it back verbatim:\n"""\n${custom}\n"""`
    : 'They wrote nothing of their own.';
  const communityBlock =
    `If you also want to grow 10x, ${host} runs a free WhatsApp community where he shares daily updates around AI.\n\nJoin here: ${community}`;
  return [
    'Write a first-person LinkedIn post from someone who just attended a session.',
    '',
    `Session: ${session} hosted by ${host}`,
    `Call the session exactly "${session}". Never rename it, never describe it as a session on some other topic.`,
    'These are the ONLY points you may write about. Cover every one, in this order, one numbered item each, and never introduce any other topic, takeaway, statistic or detail about the session. Rewrite each in fresh wording, a different angle and sentence shape from the source note, never copying the phrasing:',
    pickLines,
    customBlock,
    '',
    'Rules:',
    '- Plain text only. Never use an em dash or an en dash anywhere. Where you would reach for one, use a comma or a colon, or recast the sentence.',
    '- Every sentence must be complete and must start with a capital letter. Never leave a lowercase fragment after a full stop.',
    '- Structure it exactly like this, blank line between every paragraph: (a) one line saying they attended the session and who hosted it; (b) exactly two short lines of setup, one sentence each, what they expected versus what they actually got, with NO mention or preview of any of the numbered points; (c) the single line: Here is what stood out:; (d) the three numbered points, each starting with its number and a full stop ("1. ", "2. ", "3. ") as a short heading line under 60 characters, then ONE short sentence about it on the next line, maximum 25 words; (e) one closing line, one sentence, naming the real shift for them without repeating any point.',
    '- Keep every point tight. A point is never more than two lines total, the heading line plus one sentence. Never two sentences of explanation, never a long clause pile.',
    '- The setup lines and the closing takeaways must not repeat, summarise or hint at any numbered point, and must not name any session topic that is not in the list above. Each point appears exactly once, in the numbered list only.',
    '- Invent nothing. No numbers, results, timelines, prices, attendee counts, tool names or claims that are not in the list above or in their own words. Everything you write must be about this session and these points only.',
    '- Number every point. Never drop the numbers. The number and the short heading sit on one line, then a single line break, then the explaining sentence on its own line.',
    '- Use British spelling: optimise, optimisation, personalised, organisation.',
    '- First line must earn the read. Sentence case everywhere. No emoji, no exclamation marks, no words like unlock, supercharge, game-changer, revolutionise.',
    '- Specific and checkable, operator to operator. No hype, no hedging.',
    '- Hard limit: 150 words total, and each numbered point gets exactly ONE sentence of at most 22 words. A second sentence under a point is a failure.',
    '- Vary the opening and the closing thought from anything formulaic; write it fresh this time.',
    '- Near the end, include this block verbatim, with the "Join here:" line as its own paragraph after a blank line:',
    communityBlock,
    '- End with exactly: #AIFirst #AIWorkflows #UttamGupta',
    '- Return only the post text.',
  ].join('\n');
}

function polish(raw) {
  let text = String(raw || '')
    .trim()
    .replace(/^```[a-z]*\n?|```$/g, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .trim();
  text = text
    .replace(/\n+(Join here:)/g, '\n\n$1')
    .split('\n')
    .filter((l) => !/^\s*(his profile|thank you )/i.test(l))
    .join('\n')
    .replace(/\n+(#)/g, '\n\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([.!?]\s+)([a-z])/g, (_m, p, c) => p + c.toUpperCase())
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*\d+\.\s*)(.+)$/);
      if (!m) return line;
      const rest = m[2];
      const cut = rest.search(/[.!?](\s|$)/);
      if (cut < 0 || cut + 1 >= rest.length - 1) return line;
      return m[1] + rest.slice(0, cut + 1) + '\n' + rest.slice(cut + 1).trim();
    })
    .join('\n')
    .replace(/(^|\n)(\s*(?:\d+\.\s*)?)([a-z])/g, (_m, a, b, c) => a + b + c.toUpperCase())
    .trim();
  return text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY.' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { host, session, community, picks, custom } = body;
    if (!Array.isArray(picks) || picks.length === 0) {
      res.status(400).json({ error: 'picks must be a non-empty array.' });
      return;
    }
    const prompt = buildPrompt({
      host: String(host || 'Uttam Gupta'),
      session: String(session || 'Becoming an AI First Professional session'),
      community: String(community || ''),
      picks: picks.slice(0, 3),
      custom: String(custom || '').trim(),
    });

    const result = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = result.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
    const polished = trimPost(polish(raw), picks.slice(0, 3));
    res.status(200).json({ post: polished });
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const message =
      status === 429
        ? 'The AI is rate-limited right now. Try again in a few seconds.'
        : status === 401
        ? 'AI credentials are invalid on the server.'
        : err?.message || 'Something went wrong.';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
}
