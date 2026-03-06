//ia/providers/OpenAIProvider.js
const { OpenAI } = require("openai");

class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = "gpt-4o-mini";
  }

  async generateResponse(systemPrompt, userMessage, tools = [], history = []) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ];

      const formattedTools = tools.length > 0 ? tools : undefined;

      const toolChoice = formattedTools ? "auto" : undefined;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: formattedTools,
        tool_choice: toolChoice,
        temperature: 0.3,
        max_tokens: 500,
      });

      const message = completion.choices[0].message;

      // Se a IA decidiu chamar uma função
      if (message.tool_calls && message.tool_calls.length > 0) {
        return JSON.stringify({ tool_calls: message.tool_calls });
      }

      return message.content;
    } catch (error) {
      console.error(`[OpenAI Error]: ${error.message}`);
      throw error;
    }
  }
}

module.exports = OpenAIProvider;
