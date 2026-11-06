-- Ranking da Cobrinha (fase 1). Rode no SQL Editor do Supabase.

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  nickname text not null check (char_length(nickname) between 1 and 12),
  score int not null check (score between 1 and 1500),
  created_at timestamptz not null default now()
);

create index if not exists scores_created_idx on public.scores (created_at desc);
create index if not exists scores_player_idx on public.scores (player_id, score desc);

alter table public.scores enable row level security;

-- Qualquer pessoa le o ranking e envia pontuacao; ninguem altera ou apaga.
drop policy if exists "ler ranking" on public.scores;
create policy "ler ranking" on public.scores for select to anon using (true);

drop policy if exists "enviar pontuacao" on public.scores;
create policy "enviar pontuacao" on public.scores for insert to anon with check (true);

-- Melhor pontuacao de cada jogador (apelido mais recente), geral e da semana.
create or replace view public.ranking_all as
select distinct on (player_id)
  player_id, nickname, score, created_at
from public.scores
order by player_id, score desc, created_at asc;

create or replace view public.ranking_week as
select distinct on (player_id)
  player_id, nickname, score, created_at
from public.scores
where created_at >= date_trunc('week', now())
order by player_id, score desc, created_at asc;

grant select on public.ranking_all, public.ranking_week to anon;
