🧠 ConfirmaMED AI Core - Documentação Técnica (v3.0)
Versão: 3.0 (Personalizada & Integrada)
Responsável: Arquitetura de Software
Última Atualização: Fev/2026

1. Visão Geral da Arquitetura
   O módulo de IA do ConfirmaMED opera sob uma arquitetura de Redundância, Supervisão Adversária e Personalização Multi-Tenant. Diferente de chatbots tradicionais, ele não depende de um único provedor, possui camadas de segurança clínica e se adapta ao tom de voz de cada clínica.

Topologia "Dual AI"
IA Primária (Cérebro): OpenAI (gpt-4o). Responsável pela lógica, empatia e decisão de ferramentas (Function Calling).

IA Secundária (Auditor/Backup): Google Gemini (gemini-1.5-flash). Responsável por auditar as decisões da IA primária e assumir o controle em caso de falha (Failover).

Fluxo de Dados Simplificado
Snippet de código
[WhatsApp] -> [WebhookController] -> [Identifica Clínica & Configs]
|
[Carrega Sessão FSM]
|
[AIOrchestrator]
|
(PII Masking)
|
[Tenta OpenAI] --(Erro?)--> [Fallback Gemini]
|
[Decisão da IA]
|
[Auditoria Gemini] --(Reprovado?)--> [Bloqueio]
|
[Execução SQL (Tools)] -> [Resposta] 2. Estrutura de Diretórios (src/services/ia)
Plaintext
src/services/ia/
├── AIOrchestrator.js # O "Gerente". Ponto único de entrada. Gerencia Failover, Logs e Personalização.
├── providers/ # Adaptadores para APIs externas (Design Pattern: Adapter).
│ ├── AIProvider.js # Interface Abstrata (Contrato).
│ ├── OpenAIProvider.js # Implementação GPT-4o (Stateless / Chat Completions).
│ └── GeminiProvider.js # Implementação Gemini Flash (Audit & Backup).
├── security/
│ └── PIIMasker.js # Middleware de Anonimização (LGPD). Remove CPFs/Emails.
├── tools/ # Ferramentas SQL (As "Mãos" da IA).
│ ├── AvailabilityTool.js # Consulta slots livres (Reusa AvailabilityService).
│ ├── ProtocolTool.js # Busca preparos de exames (RAG).
│ └── SchedulingTool.js # Realiza o INSERT na tabela consultas.
└── prompts/ # System Prompts Dinâmicos (Templates).
└── index.js # Funções que geram prompts baseados na config da clínica. 3. Componentes Chave e Manutenção
3.1. AI Orchestrator (AIOrchestrator.js)
É o coração do sistema. Ele não sabe "pensar", ele sabe "quem chamar" e "como configurar".

Injeção Dinâmica: Recebe a unitConfig (regras da clínica) e injeta no Template de Prompt antes de chamar a IA.

Circuit Breaker: Se primary falhar, chama secondary.

Logging: Grava interações na tabela ai_audit_logs.

3.2. Providers (providers/\*)
Isolam a lógica específica de cada API.

OpenAIProvider: Configurado com temperature: 0.3 e tool_choice: "auto".

GeminiProvider: Configurado para velocidade. O método auditResponse retorna JSON puro { aprovado: boolean }.

3.3. Personalização (prompts/index.js)
Os prompts não são textos fixos, são funções.

Como funciona: TRIAGEM(config) -> Retorna "Você é a assistente da Clínica X, com tom de voz Y".

Manutenção: Para alterar o comportamento global, edite este arquivo. Para alterar uma clínica específica, edite a tabela unidades no banco.

4. Banco de Dados e Persistência
   4.1. Tabela chat_sessions (A Memória FSM)
   estado_atual: Define a "personalidade" (Prompt) ativa.

TRIAGEM: Identificação inicial.

ORIENTACOES: Tira-dúvidas (RAG).

AGENDAMENTO: Busca de horários.

expires_at: TTL (Time-To-Live). Sessões expiram em 24h (Direito ao Esquecimento).

4.2. Tabela ai_audit_logs (A Caixa Preta)
Registro imutável para defesa jurídica e análise de qualidade.

Colunas críticas: input_usuario, decisao_ia, veredicto_auditoria, latency_ms.

4.3. Tabela procedimentos (O Cérebro Médico - RAG)
Campos preparo_obrigatorio, contraindicacoes são lidos pela ProtocolTool.

RAG Estrito: A IA é proibida de inventar preparos. Ela só repete o que está nestes campos.

4.4. Tabela unidades (Configuração Multi-Tenant)
Coluna config_ia (JSONB): Guarda { "tom_de_voz": "Formal", "regras": "Não atendemos convênio X" }.

Isso permite que cada cliente tenha uma IA única sem mudar o código.

5. Ferramentas (Tools) e Integrações
   5.1. AvailabilityTool
   Reutiliza o src/services/core/AvailabilityService.js.

Segurança: A IA não calcula slots. Ela apenas pede ao Service legado e formata a resposta.

5.2. ProtocolTool
Realiza busca Fuzzy (ILIKE) na tabela procedimentos.

Fallback: Se não achar protocolo, retorna NULL, e a IA é instruída a transferir para humano.

5.3. WebhookController (A Integração)
Identifica a instância do WhatsApp (instanceId).

Carrega as configs da unidade.

Gerencia a criação/recuperação da sessão.

Executa a resposta (Texto ou Tool) via WhatsappService.

6. Procedimentos de Manutenção e Troubleshooting
   Cenário A: A OpenAI caiu
   Sintoma: Logs de erro [OpenAI Error] no terminal.

Comportamento: O sistema muda automaticamente para o Gemini. Nenhuma ação manual necessária.

Cenário B: Cliente reclama que a IA é "muito informal"
Ação: Vá no painel administrativo (ou banco), tabela unidades, coluna config_ia.

Ajuste: Mude tom_de_voz para "Formal, técnico e sério".

Resultado: Na próxima mensagem, o Prompt será regenerado com a nova instrução.

Cenário C: A IA agendou num horário bloqueado
Causa: Concorrência. Dois pacientes tentando o mesmo slot.

Proteção: A SchedulingTool faz uma verificação final de WHERE status = 'AGENDADO' antes do Insert. Se falhar, a IA recebe o erro e pede para o usuário escolher outro horário.

7. Pontos de Atenção (Warning Zone ⚠️)
   PII Masking: Nunca desative o PIIMasker. Enviar CPF real para a OpenAI viola a LGPD.

Timeouts: O WhatsApp espera resposta em ~15s. Se o AvailabilityService for lento (muitas consultas no banco), a IA pode dar timeout. Mantenha os índices do banco otimizados.

Auditoria Falso-Positivo: Se o Gemini bloquear muitos agendamentos legítimos, ajuste o prompt AUDITORIA em prompts/index.js para ser menos restritivo.

Fim da Documentação Técnica.
