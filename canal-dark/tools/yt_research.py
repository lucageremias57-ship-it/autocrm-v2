#!/usr/bin/env python3
"""Pesquisa de YouTube grátis (substituto do vidIQ) — yt-dlp + autocomplete.

Requisitos: pip install yt-dlp youtube-transcript-api
Rede: www.youtube.com, suggestqueries-clients6.youtube.com

Comandos:
  video <url|id>                 metadados + estatísticas
  transcricao <url|id> [lang]    transcrição com timestamps (pt, en...)
                                 * rode no seu computador: em IP de nuvem o YouTube
                                   pede login anti-bot. Na nuvem use o vidIQ.
  canal <url|@handle> [-n 30]    stats do canal + outlier score de cada vídeo
  outliers "<termo>" [-n 20]     vídeos da busca que performam acima do próprio canal
  keywords "<semente>"           palavras-chave do autocomplete (semente + a–z)
  similares "<termo>"            canais que mais aparecem no nicho (busca + keywords)
Adicione --json para saída em JSON.
"""
import json
import statistics
import string
import sys
import urllib.parse
import urllib.request
from collections import Counter

import yt_dlp

LANG = "pt"
GL = "BR"
_CHANNEL_CACHE = {}


def ydl(flat=True, limit=None, lang=None):
    lang = lang or LANG
    return yt_dlp.YoutubeDL({
        **({"playlistend": limit} if limit else {}),
        "quiet": True, "no_warnings": True, "skip_download": True,
        "extract_flat": "in_playlist" if flat else False,
        "extractor_args": {"youtube": {"lang": [lang]}},
        "http_headers": {"Accept-Language": f"{lang},{lang[:2]};q=0.9"},
        "ignoreerrors": True,
    })


def vid_url(v):
    return v if v.startswith("http") else f"https://www.youtube.com/watch?v={v}"


def chan_url(c):
    if c.startswith("http"):
        base = c.rstrip("/")
    elif c.startswith("@"):
        base = f"https://www.youtube.com/{c}"
    else:
        base = f"https://www.youtube.com/channel/{c}"
    return base if base.endswith("/videos") else base + "/videos"


def fmt(n):
    if n is None:
        return "?"
    for d, s in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if n >= d:
            return f"{n / d:.1f}{s}"
    return str(int(n))


# ---------------------------------------------------------------- video
def video(v):
    i = ydl(flat=False).extract_info(vid_url(v), download=False) or {}
    keep = ["id", "title", "channel", "channel_id", "channel_follower_count", "upload_date",
            "duration", "view_count", "like_count", "comment_count", "tags", "categories",
            "description", "chapters", "thumbnail"]
    out = {k: i.get(k) for k in keep}
    if out["view_count"] and out["like_count"]:
        out["engagement"] = round(out["like_count"] / out["view_count"], 4)
    return out


def transcricao(v, lang=None):
    """Legendas (manuais ou automáticas) via yt-dlp, formato json3."""
    y = ydl(flat=False)
    i = y.extract_info(vid_url(v), download=False) or {}
    prefs = [lang] if lang else [LANG, "pt-BR", "en", "en-US"]
    for pool in (i.get("subtitles") or {}, i.get("automatic_captions") or {}):
        for lg in prefs + list(pool):
            fmts = pool.get(lg)
            if not fmts:
                continue
            url = next((f["url"] for f in fmts if f.get("ext") == "json3"), None)
            if not url:
                continue
            data = json.loads(y.urlopen(url).read().decode("utf-8"))
            segs = []
            for ev in data.get("events", []):
                txt = "".join(x.get("utf8", "") for x in ev.get("segs", []) or []).strip()
                if txt:
                    segs.append({"t": round(ev.get("tStartMs", 0) / 1000, 1), "texto": txt})
            return segs
    return []


# ---------------------------------------------------------------- canal
def canal(c, n=30):
    key = (c, n)
    if key in _CHANNEL_CACHE:
        return _CHANNEL_CACHE[key]
    # em pt o YouTube abrevia "241 mil" e o parser lê 241 — números em inglês saem certos
    info = ydl(limit=n, lang="en").extract_info(chan_url(c), download=False) or {}
    vids = [e for e in (info.get("entries") or []) if e][:n]
    views = [e.get("view_count") for e in vids if e.get("view_count")]
    med = statistics.median(views) if views else None
    rows = []
    for e in vids:
        vc = e.get("view_count")
        rows.append({"id": e.get("id"), "titulo": e.get("title"), "views": vc,
                     "duracao": e.get("duration"),
                     "outlier": round(vc / med, 2) if vc and med else None})
    out = {"canal": info.get("channel") or info.get("title"), "channel_id": info.get("channel_id"),
           "inscritos": info.get("channel_follower_count"), "mediana_views": med,
           "videos_analisados": len(rows), "videos": rows}
    _CHANNEL_CACHE[key] = out
    return out


# ---------------------------------------------------------------- busca/outliers
def busca(termo, n=20):
    info = ydl().extract_info(f"ytsearch{n}:{termo}", download=False) or {}
    return [e for e in (info.get("entries") or []) if e]


def outliers(termo, n=20, base=15):
    res = []
    for e in busca(termo, n):
        cid = e.get("channel_id")
        if not cid or not e.get("view_count"):
            continue
        ch = canal(cid, base)
        med = ch.get("mediana_views")
        score = round(e["view_count"] / med, 2) if med else None
        res.append({"id": e["id"], "titulo": e.get("title"), "canal": e.get("channel"),
                    "inscritos": ch.get("inscritos"), "views": e["view_count"],
                    "mediana_canal": med, "outlier": score})
    return sorted(res, key=lambda r: r["outlier"] or 0, reverse=True)


# ---------------------------------------------------------------- keywords
def autocomplete(q):
    url = ("https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt"
           f"&hl={LANG}&gl={GL}&q={urllib.parse.quote(q)}")
    raw = urllib.request.urlopen(url, timeout=15).read().decode("utf-8", "ignore")
    data = json.loads(raw[raw.index("(") + 1: raw.rindex(")")])
    return [s[0] for s in data[1]]


def keywords(semente):
    cont = Counter()
    for i, s in enumerate(autocomplete(semente)):
        cont[s] += 20 - i  # posição no autocomplete ~ popularidade relativa
    for ch in string.ascii_lowercase:
        for i, s in enumerate(autocomplete(f"{semente} {ch}")):
            cont[s] += 10 - min(i, 9)
    return [{"keyword": k, "forca": v} for k, v in cont.most_common()]


def similares(termo, n=15):
    cont, nomes = Counter(), {}
    termos = [termo] + [k["keyword"] for k in keywords(termo)[:4]]
    for t in termos:
        for e in busca(t, n):
            if e.get("channel_id"):
                cont[e["channel_id"]] += 1
                nomes[e["channel_id"]] = e.get("channel")
    return [{"canal": nomes[c], "channel_id": c, "aparicoes": k} for c, k in cont.most_common(25)]


# ---------------------------------------------------------------- CLI
def main(argv):
    as_json = "--json" in argv
    argv = [a for a in argv if a != "--json"]
    n = None
    if "-n" in argv:
        i = argv.index("-n")
        n = int(argv[i + 1])
        del argv[i:i + 2]
    if len(argv) < 2:
        print(__doc__)
        return
    cmd, arg = argv[0], argv[1]
    fn = {
        "video": lambda: video(arg),
        "transcricao": lambda: transcricao(arg, argv[2] if len(argv) > 2 else None),
        "canal": lambda: canal(arg, n or 30),
        "outliers": lambda: outliers(arg, n or 20),
        "keywords": lambda: keywords(arg),
        "similares": lambda: similares(arg),
    }.get(cmd)
    if not fn:
        print(__doc__)
        return
    out = fn()
    if as_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return
    if cmd == "canal":
        print(f"{out['canal']} · {fmt(out['inscritos'])} inscritos · mediana {fmt(out['mediana_views'])}")
        for r in sorted(out["videos"], key=lambda r: r["outlier"] or 0, reverse=True):
            print(f"  {r['outlier'] or '?':>6}x  {fmt(r['views']):>7}  {r['titulo']}")
    elif cmd == "outliers":
        for r in out:
            print(f"{r['outlier'] or '?':>6}x  {fmt(r['views']):>7}  [{r['canal']} · {fmt(r['inscritos'])}]  {r['titulo']}  (youtu.be/{r['id']})")
    elif cmd == "keywords":
        for r in out[:60]:
            print(f"{r['forca']:>4}  {r['keyword']}")
    elif cmd == "similares":
        for r in out:
            print(f"{r['aparicoes']:>3}  {r['canal']}  ({r['channel_id']})")
    elif cmd == "transcricao":
        for s in out:
            m, sec = divmod(int(s["t"]), 60)
            print(f"[{m}:{sec:02d}] {s['texto']}")
    else:
        print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main(sys.argv[1:])
