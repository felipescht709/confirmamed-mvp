# Política de Governança de Inteligência Artificial (ISO/IEC 42001)

## 1. Objetivo
Esta política estabelece as diretrizes para o desenvolvimento, implantação e uso de sistemas de IA no projeto ConfirmaMED, garantindo ética, transparência e segurança dos dados dos pacientes.

## 2. Escopo
Aplica-se a todos os módulos que utilizam LLMs (OpenAI, Gemini) para triagem, agendamento e orquestração de mensagens.

## 3. Diretrizes de Segurança e Privacidade
- **Mascaramento de PII:** Todos os dados de identificação pessoal (nome, CPF, telefone) devem ser mascarados via `PIIMasker` antes de serem enviados para provedores de IA externos.
- **Isolamento de Tenant:** O orquestrador de IA deve sempre respeitar o `unidade_id` do contexto para evitar vazamento de dados entre clínicas.
- **Audit Log:** Todas as interações com a IA devem ser registradas na tabela `ai_audit_logs` para fins de auditoria e depuração.

## 4. Mitigação de Riscos
- **Alucinações:** A IA deve basear suas respostas exclusivamente no contexto fornecido pelo RAG (Protocolos da Unidade).
- **Viés:** Avaliações periódicas devem ser realizadas para garantir a imparcialidade das orientações de triagem.

## 5. Conformidade
O projeto busca alinhamento com:
- **LGPD:** Lei Geral de Proteção de Dados (Brasil).
- **ISO/IEC 42001:** Sistema de Gestão de Inteligência Artificial.
