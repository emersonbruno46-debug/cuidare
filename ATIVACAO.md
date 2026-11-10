# GUIA DE ATIVAÇÃO, SUPABASE E PUBLICAÇÃO — CUIDARE ESPAÇO DE BELEZA

Este guia contém os comandos exatos, a configuração de variáveis de ambiente, os passos de migração do Supabase, aplicação de políticas RLS, criação de contas, publicação na Vercel e procedimentos de reversão.

---

## 1. Execução Local e Verificação do Projeto

### Instalação de Dependências
```bash
npm install
```

### Executar em Modo de Desenvolvimento
```bash
npm run dev
```

### Executar Linter (Oxlint)
```bash
npm run lint
```

### Compilação e Build de Produção
```bash
npm run build
```

---

## 2. Configuração de Variáveis de Ambiente (`.env`)

Crie o arquivo `.env` na raiz do projeto baseado nas variáveis abaixo:

```env
# URL do projeto no Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave pública (publishable key)
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> **Atenção de Segurança:** Nunca inclua a `SUPABASE_SERVICE_ROLE_KEY` no código do frontend. A chave service role deve ficar restrita a scripts de servidor ou Supabase Edge Functions.

---

## 3. Aplicação das Migrações no Supabase

As migrações ficam em `supabase/migrations/` e devem ser aplicadas nesta ordem:

1. `20261105000001_esquema.sql`: tabelas, com a trava que impede dois agendamentos no mesmo horário para a mesma profissional.
2. `20261105000002_regras_agendamento.sql`: funções que o site chama (`get_available_slots` e `create_public_booking`), além das automações de comissão, histórico, mensagens de WhatsApp e registro de alterações.
3. `20261105000003_seguranca_rls.sql`: permissões de acesso para visitante, colaboradora e administradora.
4. `20261105000004_dados_iniciais.sql`: categorias, equipe, serviços e horário do salão. Este arquivo é **gerado** a partir de `src/data` com `npm run db:seed`; não edite à mão.
5. `20261109000005_indices_extras.sql`: índices sugeridos pela verificação de desempenho do Supabase.
6. `20261109000006_nome_regra_cancelamento.sql`: nome claro para a regra "cancelamento exige motivo".
7. `20261110000007_cliente_remarca_cancela.sql`: link pessoal (`/meu-agendamento/<chave>`) para a cliente remarcar ou cancelar sozinha. Regras em `business_settings`: até 12 horas antes (`client_change_min_hours`), no máximo 2 remarcações (`client_max_reschedules`). A profissional substituída e a substituta recebem aviso (`staff_alert`) na fila de WhatsApp.
8. `20261110000008_avisos_equipe_nao_cancelam.sql`: avisos para a equipe nunca são descartados quando o agendamento muda de novo.

> As migrações de 25/09/2026 foram substituídas por estas. Elas nunca chegaram a ser aplicadas e tinham erros: as permissões não funcionavam e faltavam as categorias `noivas` e `cursos`.

### Testar antes de aplicar
```bash
npm run test:db
```
O comando roda todas as migrações num Postgres temporário e confere 66 situações: horários, conflitos, permissões, comissão, histórico e o link pessoal da cliente.

### Opção A: Via Supabase CLI (Recomendado)
```bash
npx supabase login
npx supabase init        # só na primeira vez (cria supabase/config.toml)
npx supabase link --project-ref <id-do-seu-projeto>
npx supabase db push
```

### Opção B: Via SQL Editor do Painel Supabase
Abra o **SQL Editor** e execute o conteúdo dos 4 arquivos, um de cada vez, na ordem acima.

---

## 4. Criação de Administradoras e Colaboradoras

O papel de cada pessoa fica na tabela `staff_members`, e não no token de login. Assim, desativar alguém bloqueia o acesso na hora.

### Primeira administradora (feito uma única vez)
1. No Supabase Dashboard, acesse **Authentication > Users > Add user > Create new user**, informe e-mail e senha e marque **Auto Confirm User**.
2. No **SQL Editor**, ligue o usuário ao papel de administradora:

```sql
insert into public.staff_members (user_id, name, email, role)
select id, 'Lane Viana', email, 'admin' from auth.users where email = 'EMAIL-DA-LANE';
```

### Demais pessoas (pelo próprio painel)
Com a administradora logada, abra **Equipe > Nova conta de acesso**, escolha a profissional, o e-mail e a senha inicial. A conta é criada pela Edge Function `criar-acesso-equipe` (código em `supabase/functions/`), que roda no servidor com a chave secreta.

- **Esqueceu a senha:** em **Equipe**, use o botão **Nova senha** da pessoa.
- **Trocar a própria senha:** menu lateral, **Trocar minha senha**.
- **Desativar:** em **Equipe**, clique em **Ativo** para virar **Inativo**.

### O que cada papel pode fazer
| | Visitante do site | Colaboradora | Administradora |
|---|---|---|---|
| Ver serviços, equipe e horário do salão | ✅ | ✅ | ✅ |
| Ver horários livres e agendar | ✅ (só pelas funções do banco) | ✅ | ✅ |
| Ver agendamentos | ❌ | só os próprios | todos |
| Ver clientes | ❌ | só as que atendeu | todas |
| Folgas e horário próprio | ❌ | os próprios | de todas |
| Preços, equipe, configurações | ❌ | ❌ | ✅ |
| Registro de alterações | ❌ | ❌ | só leitura |

---

## 5. Publicação na Vercel

1. Instale a Vercel CLI (se necessário):
   ```bash
   npm install -g vercel
   ```
2. Realize o deploy para produção:
   ```bash
   vercel --prod
   ```
3. No painel da Vercel em **Settings > Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## 6. Procedimento de Reversão (Rollback)

### Rollback do Deploy na Vercel
Para reverter a publicação para uma versão anterior estável na Vercel:
```bash
vercel rollback
```
Ou acesse **Vercel Dashboard > Deployments**, selecione o deployment desejado e clique em **Promote to Production**.

### Rollback de Migrações no Banco de Dados Supabase
Caso precise resetar o esquema do banco de dados em ambiente de homologação:
```bash
npx supabase db reset
```

---

*Manual de Ativação atualizado em 05/11/2026.*
