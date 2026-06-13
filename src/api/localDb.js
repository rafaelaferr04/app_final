import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TABLE_MAP = {
  Transaction:    'transactions',
  SavingsGoal:    'savings_goals',
  UserProfile:    'user_profiles',
  CourseProgress: 'course_progress',
  ChatMessage:    'chat_messages',
  Achievement:    'achievements',
};

async function getCurrentEmail() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email ?? null;
}

export function createEntityManager(entityName) {
  const table = TABLE_MAP[entityName];

  return {
    async create(data) {
      const email = await getCurrentEmail();
      const row = {
        ...data,
        created_date: new Date().toISOString(),
        created_by: data.created_by ?? email,
      };
      const { data: result, error } = await supabase
        .from(table)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return result;
    },

    async filter(filters = {}, sortField = null, limit = null) {
      let query = supabase.from(table).select('*');

      for (const [k, v] of Object.entries(filters)) {
        query = query.eq(k, v);
      }

      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = desc ? sortField.slice(1) : sortField;
        query = query.order(field, { ascending: !desc });
      }

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    async update(id, data) {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}
