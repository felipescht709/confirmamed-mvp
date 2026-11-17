# 🧠 ConfirmaMED AI Core - Documentação Técnica (LangGraph - v4.0)

**Versão:** 4.0 (Arquitetura de Grafos / LangGraph)
**Responsável:** Arquitetura de Software / Engenharia de IA

---

## 1. Visão Geral da Arquitetura

A arquitetura de IA do ConfirmaMED utiliza o **LangGraph** para orquestrar fluxos complexos, transformando a interação numa **Máquina de Estados Finitos (FSM)**. O foco central desta arquitetura é garantir Rastreabilidade e Compliance com a **ISO/IEC 42001** (Sistemas de Gestão de IA) e a **LGPD**, através do padrão de "Adversarial AI" (Uma IA auditando a outra).

### 1.1. O Estado Global (`ConfirmaMedState.js`)

Tudo o que flui pelo grafo passa pelo `ConfirmaMedState`. Ele é o contrato imutável (atualizado via _Reducers_) que armazena:

- `messages`: Array de interações (HumanMessage, AIMessage, ToolMessage).
- `telefoneOrigem`, `unidadeId`: Identificação multi-tenant.
- `iso_audit_trail`: Dicionário contendo flags de rastreabilidade (PII, Risco Clínico, Provedor Usado).

---

## 2. Dicionário de Nós (Nodes)

Os Nós são funções assíncronas isoladas que recebem o Estado Atual, realizam um processamento e retornam uma atualização desse estado.

| Nó             | Arquivo             | Responsabilidade                                                                                                                                                                      |
| -------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gatekeeper** | `GatekeeperNode.js` | Identifica a Sessão no DB, aplica o `PIIMasker` para anonimizar CPFs/Emails (LGPD) antes de enviar para a LLM, e verifica consentimentos.                                             |
| **Brain**      | `BrainNode.js`      | É o Cérebro da operação (**OpenAI GPT-4o**). Decide se responde ao paciente usando empatia ou se executa uma _Tool_ para buscar informações no banco.                                 |
| **Tools**      | (Nativo LangGraph)  | Aciona as ferramentas contidas na pasta `tools/`. Usa zod e knex para transações seguras de banco de dados (ex: Agendamentos, Busca de Horários).                                     |
| **Fallback**   | `FallbackNode.js`   | É o Plano B (**Gemini 1.5 Flash**). Só entra em cena se a rede da OpenAI falhar ou der Timeout (Padrão Circuit Breaker / Failover).                                                   |
| **Supervisor** | `SupervisorNode.js` | É o **Auditor Clínico** (Adversarial AI - Gemini). Inspeciona a resposta que o BrainNode gerou para o paciente e bloqueia "alucinações" (ex: receitar remédios ou inventar preparos). |
| **AuditLog**   | `AuditLogNode.js`   | O escrivão. Materializa o estado final da FSM na tabela `ai_audit_logs` no PostgreSQL, garantindo o trilho da ISO 42001.                                                              |

---

## 3. Árvore de Decisão / Roteamento (`RoutingEdges.js`)

As _Edges Condicionais_ são os "guardas de trânsito" do nosso Grafo. Eles não alteram dados, apenas decidem para onde o fluxo deve seguir.

### 3.1. Roteamento pós Gatekeeper

- **SE** a sessão estiver em `TRANSBORDO` ou não houver `aceiteLgpd`: O fluxo vai direto para o `AuditLogNode` e ignora a inteligência.
- **SE NÃO**: O fluxo segue para o `BrainNode`.

### 3.2. Roteamento pós BrainNode

- **SE** a LLM decidiu chamar uma função (existe a propriedade `tool_calls` na mensagem): Vai para a execução das `tools`.
- **SE NÃO** (gerou o texto final): Segue para o `SupervisorNode` para ser auditado clinicamente.

### 3.3. Roteamento pós Tools (Guardião Anti-Loop)

- **SE** a IA entrou num loop de erro tentando chamar o banco mais de 12 vezes (`messages.length > 12`): Aciona o `FallbackNode` para gerar uma quebra técnica educada e parar de consumir tokens.
- **SE NÃO**: O fluxo volta para o `BrainNode` ler o resultado que o banco de dados retornou.

---

## 4. Fluxo Topológico (Autômato)

```plaintext
                    [ Início (START) ]
                            |
                            v
                    (1) Gatekeeper Node
                            |
            [Transbordo ou Sem LGPD?] ----------> (Fim / AuditLog)
                            |
                            v (Aprovado)
                    (2) Brain Node (GPT-4o) <------------+
                            |                            |
            [A IA chamou alguma Ferramenta?]             |
               /                       \                 |
            SIM                        NÃO               |
            /                            \               |
           v                              v              |
    (3) Tools Node                (4) Supervisor Node    |
           |                              |              |
    [Loop Técnico > 12x?]                 |              |
       /           \                      |              |
     NÃO           SIM                    |              |
     /               \                    |              |
 (Volta ao Brain)  (Fallback Node Gemini) |              |
                       |                  |              |
                       +------------------+              |
                                          |              |
                                          v              |
                                  (5) AuditLog Node      |
                                          |              |
                                          v              |
                                      [ END ]
```

## 5. Como dar manutenção e Escalar?

1. **Para adicionar uma nova Ferramenta (Tool):**
   - Crie o arquivo `tools/NomeDaFerramentaTool.js`.
   - Use a classe `DynamicStructuredTool` com validação de esquema via `zod`.
   - Importe e adicione ao Array em `tools/index.js`. O `ToolNode` detectará automaticamente.

2. **Para adicionar novas regras de Estado Global:**
   - Altere `state/ConfirmaMedState.js` adicionando a chave na estrutura `Annotation.Root`.
   - Declare o `reducer` se precisar que os dados antigos façam mescla/merge com os dados novos.

3. **Para ajustar a rígidez do Auditor Médico:**
   - Edite o prompt interno do arquivo `nodes/SupervisorNode.js`. Ele usa _Structured Output_ nativo para forçar a API do Gemini a devolver um JSON booleano com a flag de aprovação.

4. **Troubleshooting Geral:**
   - Se a IA devolver a mensagem: _"Desculpe, por diretrizes de segurança clínica, não posso responder a essa solicitação"_, significa que a ISO 42001 barrou o LLM primário através do `SupervisorNode`. Cheque a tabela `ai_audit_logs` no banco de dados para ver a justificativa.
   - Se a IA responder _"nosso sistema de atendimento está passando por uma instabilidade técnica"_, significa que a compilação do Grafo `builder.compile().invoke()` encontrou uma exceção não-tratada, provavelmente erro de syntax em uma `Tool` recém adicionada.
