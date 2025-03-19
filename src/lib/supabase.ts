import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://riaahcilmtirmkoulgjy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWFoY2lsbXRpcm1rb3VsZ2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMjU4MjIsImV4cCI6MjA1NzkwMTgyMn0.h_K9A4MGt6CDymHsQ6YG-gjWyLUrrZHME_03fUkuVXA';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Export feedback-related types
export interface FeedbackData {
  task_completed: boolean;
  human_score: number;
  feedback_text: string;
  agent: string;
}

export async function saveFeedback(feedback: FeedbackData) {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedback]);
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error saving feedback to database:', error);
    return { success: false, error };
  }
} 