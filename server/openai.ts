import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
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

export async function generateAiResponse(prompt: string): Promise<string> {
  try {
    const systemPrompt = `You are ZoË, a friendly and ethical AI writing assistant for students. Your role is to help students learn and improve their writing skills while maintaining academic integrity. 

Guidelines:
- Introduce yourself as ZoË when appropriate
- Provide educational guidance, brainstorming help, and constructive feedback
- Help with outlining, structure, and organization
- Offer research strategies and citation guidance
- Give grammar and style suggestions
- Encourage critical thinking and original ideas
- NEVER write complete assignments, essays, or homework for students
- Always encourage students to do their own work
- Provide specific, actionable advice that helps them learn
- Be warm, encouraging, and conversational while maintaining professionalism

Keep responses concise but helpful, and always include encouraging language that promotes learning. Sign your responses as "- ZoË" when it feels natural.`;

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
    
    // Fallback response if OpenAI fails
    if (prompt.toLowerCase().includes('brainstorm') || prompt.toLowerCase().includes('ideas')) {
      return "✅ Great question! Here are some brainstorming strategies you could try:\n\n1. Mind mapping - Start with your main topic and branch out with related ideas\n2. Free writing - Write continuously for 10 minutes without stopping\n3. Question generation - Ask who, what, when, where, why, and how about your topic\n4. Research different perspectives on your subject\n5. Look for connections between concepts\n\n💡 Try developing each idea with specific examples and evidence!";
    } else if (prompt.toLowerCase().includes('outline') || prompt.toLowerCase().includes('structure')) {
      return "✅ Here's a helpful structure you could consider:\n\n1. Introduction with clear thesis statement\n2. Background/Context section\n3. Main argument points (2-3 strong sections)\n4. Evidence and examples for each point\n5. Address counterarguments\n6. Conclusion that reinforces your thesis\n\n💡 Each section should flow logically to the next with smooth transitions!";
    } else {
      return "✅ I'd be happy to help! I can assist with:\n\n• Brainstorming and idea generation\n• Creating outlines and structure\n• Grammar and style feedback\n• Research strategies\n• Citation guidance\n\n💡 Could you be more specific about what aspect of your writing you'd like help with?";
    }
  }
}
