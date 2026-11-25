# yt_research.py — pesquisa de YouTube grátis

Substitui as funções de pesquisa do vidIQ sem créditos nem API key.

```bash
pip install yt-dlp
python3 yt_research.py keywords "banco master"          # autocomplete BR (semente + a–z), ranqueado
python3 yt_research.py outliers "banco master" -n 20    # vídeos acima da mediana do próprio canal
python3 yt_research.py canal UCxxxx -n 30               # inscritos, mediana e outlier de cada vídeo
python3 yt_research.py similares "dinheiro e poder"     # canais que dominam o nicho
python3 yt_research.py video <id>                       # metadados, likes, engajamento
python3 yt_research.py transcricao <id>                 # só no seu computador (ver abaixo)
```

| vidIQ | Aqui | Observação |
|---|---|---|
| video stats / metadata | `video` | ✅ |
| channel stats + videos | `canal` | ✅ outlier = views ÷ mediana dos últimos N vídeos |
| outliers | `outliers` | ✅ a partir da busca do YouTube |
| keyword research | `keywords` | ⚠️ ranking relativo pelo autocomplete; sem volume absoluto |
| similar channels | `similares` | ✅ por recorrência nas buscas do nicho |
| transcript | `transcricao` | ⚠️ na nuvem o YouTube bloqueia (anti-bot); rode localmente |
| video watch (análise visual) | — | ❌ usar vidIQ quando houver créditos |

Rede necessária na nuvem: `www.youtube.com`, `suggestqueries-clients6.youtube.com`.
Adicione `--json` em qualquer comando para saída estruturada.
