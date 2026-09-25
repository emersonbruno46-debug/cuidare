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

# Chave Anônima Pública (Anon Key)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Atenção de Segurança:** Nunca inclua a `SUPABASE_SERVICE_ROLE_KEY` no código do frontend. A chave service role deve ficar restrita a scripts de servidor ou Supabase Edge Functions.

---

## 3. Aplicação das Migrações no Supabase

As migrações SQL estão organizadas e versionadas no diretório `supabase/migrations/`:

1. `supabase/migrations/20260925000001_initial_schema.sql` (Tabelas, enums e chaves primárias)
2. `supabase/migrations/20260925000002_concurrency_and_constraints.sql` (Trava transacional e função atômica `create_booking_atomic`)
3. `supabase/migrations/20260925000003_rls_policies.sql` (Políticas de segurança RLS para isolamento de dados)

### Opção A: Via Supabase CLI (Recomendado)
```bash
npx supabase link --project-ref <id-do-seu-projeto>
npx supabase db push
```

### Opção B: Via SQL Editor do Painel Supabase
Abra o **SQL Editor** do Supabase e execute o conteúdo dos 3 arquivos na ordem cronológica informada acima.

---

## 4. Criação de Administradores e Colaboradoras no Supabase Auth

Para atribuir papéis (roles) de segurança e permitir login nos painéis `/admin` e `/colaboradora`:

### Criar Administradora (Lane Viana)
1. No Supabase Dashboard, acesse **Authentication > Users > Add User**.
2. E-mail: `lane@cuidare.com.br`
3. Senha: Defina a senha inicial.
4. Execute a SQL abaixo no **SQL Editor** para definir o papel de administradora:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'lane@cuidare.com.br';
```

### Criar Colaboradora (Ex: Evelyn)
1. Crie o usuário `evelyn@cuidare.com.br` em **Authentication > Users**.
2. Vincule ao ID da profissional executando a SQL:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "collaborator", "professional_id": "evelyn"}'::jsonb
WHERE email = 'evelyn@cuidare.com.br';
```

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
3. No painel da Vercel em **Settings > Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

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

*Manual de Ativação gerado em 25/09/2026.*
