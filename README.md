# Cobrinha

![Cobrinha](store/social-preview.png)

Jogo da cobrinha para Android feito com Expo (React Native + TypeScript), com visual de console portátil: tela LCD verde, D-pad e botões A/B.

## Controles

| Controle | Ação |
| --- | --- |
| D-pad (ou deslizar no LCD) | Muda a direção |
| A / START | Jogar, pausar e continuar |
| B / SELECT | Pausa durante o jogo; fora dele, começa uma partida nova |

## Power-ups

A cada 10 pontos aparece um item no tabuleiro (um quadrado escuro com uma letra). Ele some sozinho depois de alguns segundos, piscando antes de sumir. Pegar o item aplica o efeito. Os que duram um tempo (L, 2, F, M) aparecem em uma barra no topo do LCD:

| Item | Efeito |
| --- | --- |
| **L** (lento) | O jogo fica mais devagar |
| **2** (pontos x2) | Cada comida vale 2 pontos |
| **F** (fantasma) | Atravessa as paredes e reaparece do outro lado (a cobra fica translúcida) |
| **M** (ímã) | A comida por perto vem na direção da cobra por um tempo |
| **E** (escudo) | Guarda uma proteção: na próxima batida (parede ou corpo) a cobra desvia sozinha e o escudo some. A cabeça fica com borda vermelha enquanto ele estiver ativo |
| **C** (encolher) | Corta o corpo pela metade (mínimo de 3 casas) |
| **+** (bônus) | Ganha 5 pontos na hora |

O efeito do fantasma não atravessa o próprio corpo.

O recorde fica salvo no aparelho. O jogo pausa sozinho se o app for para segundo plano.

## Ranking

Ranking compartilhado (semana e geral) com Supabase, via `fetch`, sem módulo nativo. A URL e a chave publishable do projeto `cobrinha` já estão no código (são públicas por design, a proteção está nas políticas RLS).

1. Crie um projeto em supabase.com e rode `supabase/schema.sql` no SQL Editor.
2. Para usar outro projeto, defina `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`.env` local ou secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` no CI).

O jogador é anônimo (id aleatório no aparelho) com apelido de até 12 caracteres. Fase 1 não valida a partida no servidor, só limita a pontuação aceita.

## Rodar

```bash
npm install
npx expo start
```

Abra o QR code no Expo Go (Android).

## APK

- **Build local (GitHub Actions):** o workflow `Android APK (build local)` roda a cada push na `main` e publica o artefato `cobrinha-apk`. O APK sai assinado com a chave debug do template, então serve para instalar e testar.
- **EAS Build:** workflow `EAS Build (Android)` (manual). Requer o secret `EXPO_TOKEN` no repositório.

## Identidade visual

Paleta LCD de 4 tons (`#0F380F`, `#306230`, `#8BAC0F`, `#9BBC0F`) com a maçã em `#D6456B`. Os ícones, a splash e as imagens da loja (`store/`) são gerados por script:

```bash
python3 scripts/generate-assets.py   # requer Pillow
```

## Estrutura

- `App.tsx`: tela, loop do jogo e entrada (D-pad, botões, swipe)
- `src/game/logic.ts`: regras do jogo (funções puras)
- `src/ranking/`: cliente do ranking (Supabase via fetch)
- `supabase/schema.sql`: tabela, políticas e views do ranking
- `src/components/`: tabuleiro LCD e controles do console
- `src/theme.ts`: cores
