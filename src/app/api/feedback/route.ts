import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const feedback = await req.json();
    
    // Validate feedback data
    if (
      typeof feedback.taskCompleted !== 'boolean' ||
      typeof feedback.humanScore !== 'number' ||
      typeof feedback.feedbackText !== 'string' ||
      typeof feedback.timestamp !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      );
    }
    
    // Add timestamp if not provided
    if (!feedback.timestamp) {
      feedback.timestamp = new Date().toISOString();
    }
    
    // Format data for Supabase
    const feedbackForDb = {
      task_completed: feedback.taskCompleted,
      human_score: feedback.humanScore,
      feedback_text: feedback.feedbackText,
      agent: 'tara' // Default to Tara agent
    };
    
    // Save to Supabase
    const result = await saveFeedback(feedbackForDb);
    
    if (!result.success) {
      throw new Error('Failed to save feedback to database');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
} 