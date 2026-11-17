//ia/providers/OpenAIProvider.js
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const os = require("os");

class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = "gpt-4o-mini";
  }

  /**
   * Transcreve um áudio (Buffer) para texto usando Whisper
   */
  async transcribeAudio(audioBuffer) {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio_${Date.now()}.ogg`);
    
    try {
      console.log(`📡 [Whisper] Gravando arquivo temporário: ${tempFile}`);
      fs.writeFileSync(tempFile, audioBuffer);
      
      console.log(`📡 [Whisper] Enviando para OpenAI...`);
      const response = await this.client.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: "whisper-1",
      });

      console.log(`📡 [Whisper] Resposta recebida: ${response.text.substring(0, 50)}...`);
      return response.text;
    } catch (error) {
      console.error("❌ [OpenAI Whisper Error]:", error);
      throw error;
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log(`📡 [Whisper] Arquivo temporário removido.`);
      }
    }
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
