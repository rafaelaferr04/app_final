import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TABLE_MAP = {
  Transaction:         'transactions',
  SavingsGoal:         'savings_goals',
  UserProfile:         'user_profiles',
  CourseProgress:      'course_progress',
  ChatMessage:         'chat_messages',
  Achievement:         'achievements',
  BusinessTransaction: 'business_transactions',
  BusinessKPI:         'business_kpis',
  BusinessGoal:        'business_goals',
  Department:          'departments',
  Employee:            'employees',
  BusinessAccount:     'business_accounts',
  BusinessMember:      'business_members',
  SalaryHistory:       'salary_history',
};

// These tables are shared across all members of the same business
const BUSINESS_SHARED_TABLES = new Set([
  'business_transactions', 'business_kpis', 'employees', 'departments', 'salary_history',
]);

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
      // Auto-inject business_id for shared business tables
      if (BUSINESS_SHARED_TABLES.has(table) && !row.business_id) {
        const bid = localStorage.getItem('wm_business_id');
        if (bid) row.business_id = bid;
      }
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
