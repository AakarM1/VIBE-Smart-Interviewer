
import { NextResponse } from 'next/server';
import type { AnalysisResult, ConversationEntry } from '@/types';

// This is a mock API route to demonstrate the "Expose a JSON/REST API" requirement.
// In a real application, you would fetch this data from a database based on an ID.

export async function POST(request: Request) {
  // const { conversationId } = await request.json(); // In a real app, you'd use an ID.

  // Mock data for demonstration purposes
  const mockHistory: ConversationEntry[] = [
    {
      question: "Hello Test Candidate One, thank you for your interest in the Territory Manager role. To start, please introduce yourself and tell me a bit about why you're applying for this position.",
      answer: "I am a results-oriented professional with 5 years of experience in sales and territory management. I'm excited about this role because it aligns with my skills in developing new markets and building strong customer relationships.",
      videoDataUri: "placeholder_video_uri_1"
    },
    {
      question: "Thanks for sharing that. Could you elaborate on a specific project or experience that you feel best showcases your abilities for a Territory Manager position?",
      answer: "Certainly. In my previous role, I was tasked with launching our product in a new region. I developed a comprehensive market-entry strategy, identified key distributors, and personally trained their sales teams. Within six months, we exceeded our sales targets by 20%.",
      videoDataUri: "placeholder_video_uri_2"
    }
  ];

  const mockAnalysis: AnalysisResult = {
    strengths: "The candidate demonstrates strong communication skills and provides concrete, results-oriented examples. Their experience in market development is directly relevant and impressive.",
    weaknesses: "While the candidate speaks confidently about past successes, they could provide more detail on how they handle challenging customer situations or market setbacks.",
    summary: "Overall, this is a very promising candidate for the Territory Manager role. They are articulate, experienced, and clearly motivated. The next steps should focus on probing their resilience and problem-solving skills in more adverse scenarios.",
    competencyAnalysis: [
      {
        name: "Core Skills",
        competencies: [
          { name: "Adaptability", score: 7 },
          { name: "Communication", score: 9 },
          { name: "Problem Solving", score: 6 },
          { name: "Teamwork", score: 7 },
        ]
      },
      {
        name: "Professionalism",
        competencies: [
          { name: "Dependability", score: 8 },
          { name: "Initiative", score: 9 },
          { name: "Maturity", score: 8 },
        ]
      },
       {
        name: "Role-Specific",
        competencies: [
          { name: "Domain Knowledge", score: 8 },
          { name: "Strategic Thinking", score: 7 },
          { name: "Technical Acumen", score: 5 },
        ]
      }
    ]
  };
  
  // In a real app, you'd fetch based on an ID and might have authentication here.
  return NextResponse.json({
    report: mockAnalysis,
    history: mockHistory,
  });
}
