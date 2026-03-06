class AIProvider {
  constructor(providerName) {
    this.providerName = providerName;
  }
  async generateResponse(systemPrompt, userMessage, tools = [], history = []) {
    throw new Error("Not implemented");
  }
  async auditResponse(context, action) {
    throw new Error("Not implemented");
  }
}
module.exports = AIProvider;