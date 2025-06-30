import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Restricted prompts that indicate academic dishonesty
const restrictedPrompts = [
  "write my paper",
  "complete this paragraph",
  "write an essay",
  "finish the assignment for me",
  "do my homework",
  "write this for me",
  "complete my work",
  "finish my essay",
  "write the conclusion",
  "write the introduction",
  "complete the assignment",
  "do this assignment",
  "write my homework",
  "finish this paragraph",
  "complete this sentence",
  "write my thesis",
  "finish my paper"
];

export function checkRestrictedPrompt(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  return restrictedPrompts.some(restricted => 
    lowerPrompt.includes(restricted)
  );
}

export async function generateAiResponseWithHistory(prompt: string, conversationHistory: any[] = [], documentContent?: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing in generateAiResponseWithHistory');
      throw new Error('AI service is not configured. Please contact your administrator.');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build conversation context from history
    const messages: any[] = [
      {
        role: "system",
        content: `You are ZoË, a friendly and ethical AI writing assistant for students. Your goal is to help students develop their own writing skills through guidance, brainstorming, and educational support.

CORE PRINCIPLES:
- Help students learn and improve their writing skills
- Provide educational guidance rather than doing work for them
- Maintain conversation context and stay focused on topics being discussed
- Give concrete examples and practical frameworks
- Encourage original thinking and analysis

CONVERSATION CONTEXT RULES:
- Pay close attention to the conversation history to maintain topic focus
- Build upon previous discussion points naturally
- If the student changes topics, acknowledge the shift but stay engaged
- Reference earlier parts of the conversation when relevant

DOCUMENT ANALYSIS CAPABILITIES:
${documentContent && documentContent.trim() ? `
CURRENT DOCUMENT CONTENT:
"${documentContent}"

When the student asks for:
- Grammar checks: Analyze the above document content for grammar issues and provide specific corrections using this format: 'Change "incorrect text" to "corrected text" - explanation'
- Spell checking: Review the document for spelling errors using this format: 'Replace "misspelled" with "correct" - explanation'
- Writing feedback: Provide specific feedback using this format: 'Consider changing "original phrase" to "improved phrase" - explanation'
- Content review: Analyze and comment on content, suggesting improvements in the format: 'Instead of "current text", use "better text" - explanation'

IMPORTANT: When providing corrections, always use exact quotes from the document and format your suggestions as: 'Action "exact original text" with/to "exact replacement text" - brief explanation'

This format allows the system to highlight and apply your suggestions directly in the document.
` : "No document content available. When students ask for document analysis, request them to ensure their document content is being shared properly."}

Provide helpful, educational responses that guide students toward better writing while maintaining the flow of conversation.`
      }
    ];

    // Add conversation history to maintain context
    conversationHistory.forEach((interaction: any) => {
      messages.push({
        role: "user",
        content: interaction.prompt
      });
      messages.push({
        role: "assistant",
        content: interaction.response
      });
    });

    // Add the current prompt
    messages.push({
      role: "user",
      content: prompt
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error("No response generated from OpenAI");
    }

    return aiResponse;
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Check for specific OpenAI API errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('OpenAI API key is invalid or expired');
        throw new Error("AI service authentication failed. Please contact your administrator to verify the API configuration.");
      }
      if (error.message.includes('429') || error.message.includes('rate_limit')) {
        throw new Error("AI service is temporarily busy. Please wait a moment and try again.");
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new Error("AI service quota exceeded. Please contact your administrator.");
      }
    }
    
    throw new Error("Failed to generate AI response. Please try again or contact your administrator.");
  }
}

export async function generateAiResponse(prompt: string, studentProfile?: any, documentContent?: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing in generateAiResponse');
      throw new Error('AI service is not configured. Please contact your administrator.');
    }
    let personalizedContext = "";
    if (studentProfile) {
      personalizedContext = `
Student Context (adapt your response accordingly):
- Writing Level: ${studentProfile.writingLevel || 'beginner'}
- Strengths: ${studentProfile.strengths?.join(', ') || 'developing'}
- Areas for improvement: ${studentProfile.weaknesses?.join(', ') || 'general writing skills'}
- Common mistakes: ${studentProfile.commonMistakes?.join(', ') || 'none identified yet'}
- Total sessions: ${studentProfile.totalSessions || 0}
- Recent context: ${studentProfile.lastInteractionSummary || 'first interaction'}

Tailor your response to their level and focus on their specific improvement areas.
`;
    }

    let documentContext = "";
    if (documentContent && documentContent.trim()) {
      documentContext = `
CURRENT DOCUMENT CONTENT:
"${documentContent}"

DOCUMENT ANALYSIS INSTRUCTIONS:
When the student asks for grammar, spelling, or writing feedback, analyze the above document content directly. Provide feedback using these exact formats:
- Grammar: 'Change "incorrect text" to "corrected text" - explanation'
- Spelling: 'Replace "misspelled" with "correct" - explanation'  
- Style: 'Consider changing "original phrase" to "improved phrase" - explanation'
- Content: 'Instead of "current text", use "better text" - explanation'

CRITICAL: Always use exact quotes from the document. Format suggestions as: 'Action "exact original text" with/to "exact replacement text" - brief explanation'

This structured format enables automatic highlighting and one-click corrections in the document.
`;
    }

    const systemPrompt = `You are ZoË, a knowledgeable and supportive AI writing tutor focused on providing practical, educational guidance to help students succeed academically. You provide concrete examples and starting points while maintaining academic integrity.

${personalizedContext}
${documentContext}

Your approach:
- Give practical examples: When asked about research papers, provide actual paper structures, sample thesis statements, real outline formats
- Provide concrete starting points: Specific introduction strategies, paragraph frameworks, citation examples
- Offer educational templates: Show formatting examples, provide structure guides, demonstrate academic writing patterns
- Build writing skills progressively: Break complex tasks into manageable steps with clear examples
- Support research skills: Suggest specific databases, research strategies, and source evaluation techniques

For research papers specifically:
- Provide sample thesis statements for their topic
- Show actual research paper structures (Introduction → Literature Review → Methodology → Analysis → Conclusion)
- Give concrete paragraph starters and transition phrases
- Demonstrate proper citation formats with examples
- Suggest specific research angles and subtopics

For any writing assignment:
- Provide sample outlines tailored to their topic
- Give specific examples of strong opening sentences
- Show paragraph structure examples
- Demonstrate different writing techniques with concrete examples

Always provide practical tools they can immediately apply. Give them frameworks, templates, and examples that serve as educational starting points while encouraging original thinking and analysis.

Focus on teaching writing skills through concrete examples rather than abstract advice. Help them understand what good academic writing looks like by showing specific examples.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error("No response generated");
    }

    // Add a positive prefix to indicate allowed help
    return `✅ ${aiResponse}\n\n💡 Remember: The goal is to help you develop your own writing skills and understanding!`;
    
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Check for specific OpenAI API errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('OpenAI API key is invalid or expired');
        throw new Error("AI service authentication failed. Please contact your administrator to verify the API configuration.");
      }
      if (error.message.includes('429') || error.message.includes('rate_limit')) {
        throw new Error("AI service is temporarily busy. Please wait a moment and try again.");
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new Error("AI service quota exceeded. Please contact your administrator.");
      }
    }
    
    throw new Error("Failed to generate AI response. Please try again or contact your administrator.");
  }
}
