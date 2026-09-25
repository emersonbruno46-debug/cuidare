# CUIDARE ESPAÇO DE BELEZA — PENDÊNCIAS E DECISÕES COMERCIAIS

Este documento registra as decisões comerciais pendentes, dependências de fornecedores e diretrizes operacionais do projeto **Cuidare Espaço de Beleza**.

---

## 1. Decisões Comerciais e Horários de Funcionamento

* **Horário de Encerramento Matutino (Almoço):**
  * **Situação Identificada:** Houve divergência no material bruto entre encerramento do primeiro turno às 11:00 e regra operacional até às 11:30.
  * **Definição Atual:** O sistema está centralizado com atendimento de **Terça a Sexta das 08:00 às 18:00**, com intervalo das **11:30 às 14:00**, e **Sábado das 08:00 às 18:00** (sem intervalo).
  * **Ação Pendente:** A administração do salão pode ajustar esse intervalo em tempo real pela aba `Configurações` no painel administrativo (`/admin`), sem necessidade de alteração de código.

---

## 2. Integração de Mensageria e Lembretes Automáticos (WhatsApp API)

* **Estrutura Implementada:**
  * O sistema conta com uma fila transacional de notificações (`notification_queue` no Supabase e `cuidare_notifications_v2` em localStorage).
  * Eventos suportados: `booking_created` (criação), `booking_rescheduled` (remarcação), `booking_cancelled` (cancelamento) e `reminder_24h` (lembretes).
  * **Regra de Ouro:** O agendamento é **sempre salvo com sucesso**, mesmo que o serviço de envio de WhatsApp esteja indisponível. A mensageria atua de forma assíncrona.
* **Provedor Recomendado:**
  * Recomenda-se a contratação de API do WhatsApp (ex: Evolution API self-hosted, Z-API ou Twilio for WhatsApp).
  * As credenciais necessárias (Instance Key, Security Token e Endpoint) devem ser preenchidas no painel do servidor/Supabase Edge Functions.

---

## 3. Segurança, LGPD e Autosserviço Público

* **Política de Autosserviço por ID:**
  * **Decisão de Segurança:** Não foi ativado cancelamento ou remarcação pública baseada apenas em ID sequencial/curto via URL pública, pois isso permitiria que terceiros adivinhassem agendamentos de outras clientes.
  * **Solução Atual:** A remarcação e o cancelamento com motivo obrigatório e revalidação de conflitos estão disponíveis na **área autenticada do painel** (administradoras e colaboradoras).
  * **Extensão Futura:** Caso o salão deseje permitir que a própria cliente remarque pela web, deverá ser implementado envio de Link Temporário com Token Assinado (magic link) via WhatsApp/E-mail.

---

## 4. Preservação Histórica das Taxas de Comissão

* **Regra de Integridade Financeira:**
  * Quando um atendimento é marcado como `concluido`, a taxa de comissão da profissional na data do atendimento (`commissionRate`) e o valor calculado (`commissionAmount`) são gravados de forma fixa na linha do agendamento e no histórico.
  * Se a administradora alterar a taxa da profissional (ex: de 50% para 60%) no futuro, os relatórios financeiros do passado **não serão alterados retroativamente**.

---

## 5. Cadastro de Fotos e Contatos das Profissionais

* **Pendência da Administração:**
  * Atualizar no painel administrativo os números reais de WhatsApp (formato E.164: `5538XXXXXXXXX`) de cada profissional e URLs das fotografias reais de perfil para substituição dos monogramas em SVG.

---

*Documento gerado em 25/09/2026. Projeto Cuidare.*
