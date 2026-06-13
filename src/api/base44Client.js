import { supabase, createEntityManager } from './localDb';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const base44 = {
  auth: {
    async me() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const u = session.user;
      return {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.email.split('@')[0],
      };
    },
    async logout() {
      await supabase.auth.signOut();
    },
    redirectToLogin: () => {},
  },

  entities: {
    Transaction:    createEntityManager('Transaction'),
    SavingsGoal:    createEntityManager('SavingsGoal'),
    UserProfile:    createEntityManager('UserProfile'),
    CourseProgress: createEntityManager('CourseProgress'),
    ChatMessage:    createEntityManager('ChatMessage'),
    Achievement:    createEntityManager('Achievement'),
  },

  appLogs: {
    logUserInApp: () => Promise.resolve(),
  },

  integrations: {
    Core: {
      async InvokeLLM({ prompt, response_json_schema, system } = {}) {
        const wantsJson = !!response_json_schema;
        const systemPrompt = wantsJson
          ? 'Respond ONLY with valid JSON.'
          : (system || 'És um assistente útil que responde em português de Portugal. Sê claro, conciso e encorajador.');
        const body = {
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        };
        const groqKey = import.meta.env.VITE_GROQ_API_KEY;
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`LLM error ${res.status}${errBody ? ': ' + errBody.slice(0, 120) : ''}`);
        }
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? '';
        if (wantsJson) {
          try { return JSON.parse(text); } catch {
            const m = text.match(/\{[\s\S]*\}/);
            return m ? JSON.parse(m[0]) : {};
          }
        }
        return text;
      },

      UploadFile({ file }) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ file_url: e.target.result });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      },

      async ExtractDataFromUploadedFile({ file_url }) {
        const [meta, b64] = file_url.split(',');
        const mediaType = meta.replace('data:', '').replace(';base64', '');
        const today = new Date().toISOString().split('T')[0];

        const isText = mediaType.startsWith('text/') || mediaType === 'application/csv';
        const isExcel = mediaType === 'application/vnd.ms-excel' ||
          mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const extractionPrompt = `Analisa este ficheiro e extrai TODAS as transações financeiras que encontrares. Para cada transação:
- description: descrição (nome, estabelecimento ou motivo)
- amount: valor numérico (NEGATIVO para despesas/saídas, POSITIVO para receitas/entradas)
- date: data em formato YYYY-MM-DD (usa ${today} se não encontrares)
- category: categoria mais adequada —
  Despesas: food, transport, housing, utilities, entertainment, shopping, health, education, savings, other
  Receitas: salary, freelance, investment, gift, other

Responde APENAS com este JSON: {"transactions": [{"description": "...", "amount": -12.50, "date": "2024-01-15", "category": "food"}]}`;

        const sendToGroq = async (text) => {
          const groqKey = import.meta.env.VITE_GROQ_API_KEY;
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 4096,
              messages: [
                { role: 'system', content: 'Responde APENAS com JSON válido, sem texto adicional.' },
                { role: 'user', content: `${extractionPrompt}\n\nConteúdo:\n${text}` },
              ],
            }),
          });
          if (!res.ok) throw new Error(`Extract error ${res.status}`);
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content ?? '{}';
          try { return { status: 'success', output: JSON.parse(raw) }; }
          catch { const m = raw.match(/\{[\s\S]*\}/); return { status: 'success', output: m ? JSON.parse(m[0]) : {} }; }
        };

        if (isText) {
          return sendToGroq(atob(b64));
        }

        if (isExcel) {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const workbook = XLSX.read(bytes, { type: 'array' });
          const csvParts = workbook.SheetNames.map(name =>
            XLSX.utils.sheet_to_csv(workbook.Sheets[name])
          );
          return sendToGroq(csvParts.join('\n\n'));
        }

        if (mediaType === 'application/pdf') {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const pdf = await pdfjs.getDocument({ data: bytes }).promise;
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map(item => item.str).join(' '));
          }
          return sendToGroq(pages.join('\n'));
        }

        throw new Error(`Formato de ficheiro não suportado: ${mediaType}`);
      },
    },
  },
};
