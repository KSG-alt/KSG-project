/* Live Anthropic calls, straight from the browser.

   The key is entered in the UI and kept only in localStorage. It is never
   written to a file in this repo and never sent anywhere but api.anthropic.com.
   Direct browser access needs the opt-in header below; without it the request
   is refused by CORS. */

const KEY_STORE = 'kadia.anthropic.key';
export const MODEL = 'claude-sonnet-5';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export const getKey = () => localStorage.getItem(KEY_STORE) ?? '';
export const setKey = (k: string) => localStorage.setItem(KEY_STORE, k.trim());
export const clearKey = () => localStorage.removeItem(KEY_STORE);
export const hasKey = () => getKey().length > 0;

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  run: (input: any) => unknown;
}

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface Msg {
  role: 'user' | 'assistant';
  content: string | Block[];
}

export class ApiError extends Error {}

async function once(body: unknown): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error?.message) detail = j.error.message;
    } catch {
      /* keep the status line */
    }
    throw new ApiError(detail);
  }
  return res.json();
}

export interface RunResult {
  text: string;
  messages: Msg[];
  toolsUsed: string[];
}

/* Runs the tool loop to completion. Tools execute locally against the seeded
   data, so "find anything in the system" is a real query, not a guess. */
export async function run(opts: {
  system: string;
  messages: Msg[];
  tools?: ToolSpec[];
  maxRounds?: number;
  maxTokens?: number;
}): Promise<RunResult> {
  const { system, tools = [], maxRounds = 6, maxTokens = 2048 } = opts;
  const messages: Msg[] = [...opts.messages];
  const toolsUsed: string[] = [];

  for (let round = 0; round < maxRounds; round++) {
    const data = await once({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools.length
        ? {
            tools: tools.map(({ name, description, input_schema }) => ({
              name,
              description,
              input_schema,
            })),
          }
        : {}),
    });

    const blocks: Block[] = data.content ?? [];
    messages.push({ role: 'assistant', content: blocks });

    const calls = blocks.filter((b): b is Extract<Block, { type: 'tool_use' }> =>
      b.type === 'tool_use',
    );

    if (!calls.length || data.stop_reason !== 'tool_use') {
      const text = blocks
        .filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { text, messages, toolsUsed };
    }

    const results: Block[] = calls.map((call) => {
      const tool = tools.find((t) => t.name === call.name);
      toolsUsed.push(call.name);
      let content: string;
      try {
        content = tool
          ? JSON.stringify(tool.run(call.input))
          : `No such tool: ${call.name}`;
      } catch (e) {
        content = `Tool failed: ${(e as Error).message}`;
      }
      return { type: 'tool_result', tool_use_id: call.id, content };
    });

    messages.push({ role: 'user', content: results });
  }

  throw new ApiError(`Gave up after ${maxRounds} tool rounds.`);
}
