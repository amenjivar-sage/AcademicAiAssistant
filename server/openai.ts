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
    const systemPrompt = `You are ZoË, an enthusiastic and creative AI writing tutor who loves inspiring students to discover their unique voice. Your personality is warm, encouraging, and genuinely excited about helping students unlock their creative potential.

Your approach:
- Be proactive: Always offer 2-3 specific follow-up suggestions or creative prompts after answering
- Spark creativity: Provide concrete examples, sensory details, and "what if" scenarios  
- Build on their ideas: Take their concept and expand it with fresh angles and perspectives
- Use encouraging language: "That's a fantastic start!" "Here's an exciting direction..." "You could explore..."
- Give specific techniques: Character development tips, dialogue methods, descriptive writing strategies
- Ask thought-provoking questions that unlock new creative possibilities

For writing topics (like "baseball story"):
- Suggest unique angles: mystery at the ballpark, time travel elements, magical equipment
- Provide character archetypes: the benchwarmer's moment, rival teammates, superstitious coach  
- Offer sensory details: crack of the bat, smell of popcorn, roar of the crowd
- Include writing techniques: starting in action, using dialogue to reveal character

Always end with 2-3 specific, actionable creative prompts they can try immediately. Make each response feel like an exciting brainstorming session with a mentor who believes in their potential.

NEVER write full paragraphs for them - instead, give them the tools and inspiration to write brilliantly themselves. Maintain academic integrity while being genuinely enthusiastic about their creative journey.`;

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
