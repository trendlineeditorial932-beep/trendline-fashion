#!/usr/bin/env python3
"""Draft this week's long-form TRENDLINE feature with an AI model (Gemini free tier).

Reads data/trends.json (the headlines the site has been showing), asks an AI model to
write an ORIGINAL magazine feature about the week's themes, and appends it to
data/articles.json. The GitHub Action puts the change in a pull request, so
nothing goes live until a person reviews and merges it.

Uses Google's Gemini API free tier (no billing needed). Needs the GEMINI_API_KEY secret.
Standard library only.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRENDS = ROOT / "data" / "trends.json"
ARTICLES = ROOT / "data" / "articles.json"
PR_BODY = Path(os.environ.get("PR_BODY_FILE", ROOT / "pr_body.md"))
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

CATEGORIES = ["Men", "Women", "Celebrities", "Teen", "Streetwear", "Luxury", "Sportswear",
              "Casualwear", "Formalwear", "Sustainable", "Vintage", "Accessories"]

SYSTEM = """You are a features writer for TRENDLINE, an independent fashion journal read by a general audience that includes teenagers.
Write original, well-structured magazine features in an editorial voice: curious, vivid, confident, never snarky.

Hard rules:
- Use ONLY the facts present in the headlines you are given. Do not invent designers, brands, quotes, statistics, dates, prices or events.
- Describe themes in your own words. Never copy a headline or imitate a specific publisher's article.
- You may mention a publisher or brand only if it appears in the headlines, and only as the headlines state it.
- Where you want to add context that is general knowledge (how a silhouette works, why a trend recurs), keep it broad and safe.
- Keep everything appropriate for all ages: no body-shaming, no pressure to look a certain way, no sexualised content.
- Fashion is not a set of rules about how anyone should look; write observations, not commands."""

PROMPT = """Here are fashion headlines TRENDLINE collected this week, grouped by section (headline - source):

{headlines}

Write this week's main feature: a long-form magazine article of 1,100 to 1,500 words that finds the two or three real themes running through these headlines.

Return EXACTLY this layout and nothing else:

TITLE: <a distinctive magazine headline, under 80 characters, no quotes>
CATEGORY: <one of: {categories}>
DEK: <one sentence standfirst, under 200 characters>
---BODY---
<the article. Plain paragraphs separated by blank lines. Use lines starting with "## " for 3 to 5 subheadings. No bullet lists, no markdown other than the ## subheadings.>
---FACTCHECK---
<a short bullet list (lines starting with "- ") of every specific claim in the article that rests on a headline, so a human editor can verify it before publishing>"""


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def headlines_block(trends):
    lines = []
    for key, sec in trends.get("sections", {}).items():
        items = sec.get("items", [])[:6]
        if not items:
            continue
        lines.append(f"[{key.upper()}]")
        lines.extend(f"- {i['title']} - {i['source']}" for i in items)
        lines.append("")
    return "\n".join(lines).strip()


def call_model(prompt):
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        sys.exit("GEMINI_API_KEY is not set. Add it under Settings > Secrets and variables > Actions.")
    body = json.dumps({
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 6000, "temperature": 0.8},
    }).encode()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"x-goog-api-key": key, "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as err:
        sys.exit(f"Gemini API error: HTTP {err.code} {err.read().decode()[:600]}")
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        sys.exit("Gemini returned no text: " + json.dumps(data)[:600])
    return "".join(p.get("text", "") for p in parts)


def parse(text):
    m = re.search(r"TITLE:\s*(.+)\nCATEGORY:\s*(.+)\nDEK:\s*(.+)\n---BODY---\n(.*?)\n---FACTCHECK---\n(.*)", text, re.S)
    if not m:
        sys.exit("The model's reply was not in the expected layout:\n" + text[:1500])
    title, category, dek, body, facts = (s.strip() for s in m.groups())
    category = next((c for c in CATEGORIES if c.lower() == category.lower()), "Journal")
    return title.strip('"“”'), category, dek, body, facts


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:70]


def main():
    trends = read_json(TRENDS, {})
    block = headlines_block(trends)
    if not block:
        sys.exit("data/trends.json has no headlines yet. Run the Daily trends workflow first.")

    text = call_model(PROMPT.format(headlines=block, categories=", ".join(CATEGORIES)))
    title, category, dek, body, facts = parse(text)

    words = len(body.split())
    if words < 700:
        sys.exit(f"Draft is only {words} words; refusing to publish something this short.")

    data = read_json(ARTICLES, {"articles": []})
    articles = data.get("articles", [])
    slug = slugify(title)
    if any(a.get("slug") == slug for a in articles):
        slug += "-" + datetime.now(timezone.utc).strftime("%Y%m%d")

    today = datetime.now(timezone.utc)
    articles.insert(0, {
        "slug": slug,
        "title": title,
        "category": category,
        "dek": dek,
        "article": body,
        "imageUrl": "",
        "imageCredit": "",
        "imageLicence": "",
        "publishedDate": today.strftime("%d %b %Y").upper(),
        "isoDate": today.strftime("%Y-%m-%d"),
        "author": "TRENDLINE Editorial",
    })
    data["articles"] = articles
    ARTICLES.parent.mkdir(parents=True, exist_ok=True)
    ARTICLES.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    PR_BODY.write_text(
        f"## Weekly feature draft: {title}\n\n"
        f"{dek}\n\n{words} words, category **{category}**.\n\n"
        "**Merging this pull request publishes the article** (and triggers the newsletter draft).\n\n"
        "### Before you merge\n"
        "- Read the whole article in `data/articles.json` (or open the Files changed tab).\n"
        "- Check each claim below against the original headline links on the site's Trending sections.\n"
        "- Edit the text directly in this pull request if anything needs fixing. Close the PR to skip this week.\n"
        "- Add a photo only if you have permission; fill in `imageUrl`, `imageCredit` and `imageLicence`.\n\n"
        f"### Claims to verify\n{facts}\n",
        encoding="utf-8")
    print(f"Drafted '{title}' ({words} words) as slug {slug}")


if __name__ == "__main__":
    main()
