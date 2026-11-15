#!/usr/bin/env python3
"""Fetch fresh fashion headlines for every TRENDLINE section.

Writes data/trends.json. Only headline, source name, link and date are stored
(never article text or photos), and every item links back to its publisher.
Standard library only, so the GitHub Action needs no installs.
"""
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "trends.json"
PER_SECTION = 8
USER_AGENT = "Mozilla/5.0 (compatible; TrendlineBot/1.0; +https://trendlineeditorial932-beep.github.io/trendline-fashion/)"

# key must match each page's <body data-category="...">
SECTIONS = {
    "all": "fashion trends",
    "men": "menswear fashion trends",
    "women": "womenswear fashion trends",
    "celebrities": "celebrity fashion red carpet style",
    "teen": "teen fashion trends",
    "streetwear": "streetwear fashion",
    "luxury": "luxury fashion",
    "sportswear": "sportswear athleisure fashion",
    "casualwear": "casual fashion trends",
    "formalwear": "formalwear tailoring fashion",
    "sustainable": "sustainable fashion",
    "vintage": "vintage fashion trends",
    "accessories": "fashion accessories bags shoes trends",
}

STOPWORDS = set("""
a about after all also an and any are as at be been best by can could do for from get got had has have how
i in into is it its just like make more most new not of on one or our out over say says see so than that the
their them then there these they this to up us use was we what when where which who why will with you your
fashion fashions style styles trend trends trending wear week season collection collections show shows
look looks day days 2025 2026 2027 vs top here why every ways way need needs wearing worn
""".split())


def google_news_url(query, window):
    q = f"{query} when:{window}"
    params = urllib.parse.urlencode({"q": q, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"})
    return "https://news.google.com/rss/search?" + params


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_items(xml_bytes):
    root = ET.fromstring(xml_bytes)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        source_el = item.find("source")
        source = (source_el.text or "").strip() if source_el is not None else ""
        if source and title.endswith(" - " + source):
            title = title[: -(len(source) + 3)].strip()
        elif " - " in title and not source:
            title, source = title.rsplit(" - ", 1)
        if not (title and link.startswith("https://")):
            continue
        try:
            when = parsedate_to_datetime(pub).astimezone(timezone.utc)
        except Exception:
            when = None
        items.append({
            "title": re.sub(r"\s+", " ", title),
            "source": source or "News",
            "link": link,
            "published": when.isoformat() if when else "",
        })
    return items


def norm(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())[:60]


def pick(items, seen_global):
    items.sort(key=lambda i: i["published"], reverse=True)
    out, seen_titles, per_source = [], set(), Counter()
    for item in items:
        key = norm(item["title"])
        if key in seen_titles or item["link"] in seen_global:
            continue
        if per_source[item["source"]] >= 2:  # keep a mix of publishers
            continue
        seen_titles.add(key)
        per_source[item["source"]] += 1
        out.append(item)
        if len(out) == PER_SECTION:
            break
    return out


def trending_words(items, limit=8):
    counts = Counter()
    for item in items:
        words = {w for w in re.findall(r"[a-z][a-z'-]{3,}", item["title"].lower()) if w not in STOPWORDS}
        counts.update(words)
    return [w for w, c in counts.most_common(limit * 2) if c >= 3][:limit]


def load_previous():
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {"sections": {}}


def main():
    previous = load_previous().get("sections", {})
    now = datetime.now(timezone.utc)
    sections, failures = {}, 0
    seen_global = set()

    for key, query in SECTIONS.items():
        items = []
        for window in ("2d", "7d"):  # widen the window if a section is quiet
            try:
                items = parse_items(fetch(google_news_url(query, window)))
            except Exception as err:
                print(f"[{key}] fetch failed ({window}): {err}", file=sys.stderr)
                items = []
            if len(items) >= 5:
                break
        chosen = pick(items, seen_global if key != "all" else set())
        if chosen:
            if key != "all":
                seen_global.update(i["link"] for i in chosen[:3])
            sections[key] = {"items": chosen, "words": trending_words(items)}
        elif key in previous:
            sections[key] = previous[key]  # keep yesterday's list rather than blanking the page
            failures += 1
            print(f"[{key}] kept previous items", file=sys.stderr)
        else:
            sections[key] = {"items": [], "words": []}
            failures += 1

    if all(not s["items"] for s in sections.values()):
        print("No headlines fetched at all; leaving data/trends.json untouched.", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "updated": now.isoformat(timespec="seconds"),
        "sections": sections,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    total = sum(len(s["items"]) for s in sections.values())
    print(f"Wrote {total} headlines across {len(sections)} sections ({failures} sections without fresh data).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
