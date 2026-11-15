#!/usr/bin/env python3
"""Turn the newest approved article into a Buttondown newsletter.

Runs after an article pull request is merged. By default the email is created as a
DRAFT in Buttondown so you can read it and press send yourself. Set the repository
variable NEWSLETTER_STATUS to "about_to_send" to send automatically instead.

Needs the BUTTONDOWN_API_KEY secret. Standard library only.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTICLES = ROOT / "data" / "articles.json"
TRENDS = ROOT / "data" / "trends.json"
STATE = ROOT / "data" / "newsletter_state.json"
SITE = os.environ.get("SITE_URL", "https://trendlineeditorial932-beep.github.io/trendline-fashion").rstrip("/")
STATUS = os.environ.get("NEWSLETTER_STATUS", "").strip() or "draft"


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def intro(article_text, paragraphs=2):
    parts = [p.strip() for p in article_text.split("\n\n") if p.strip() and not p.lstrip().startswith("##")]
    return "\n\n".join(parts[:paragraphs])


def build_email(article, trends):
    link = f"{SITE}/article.html?slug={article['slug']}"
    lines = [f"# {article['title']}", ""]
    if article.get("dek"):
        lines += [f"*{article['dek']}*", ""]
    lines += [intro(article["article"]), "", f"**[Read the full story on TRENDLINE]({link})**", ""]
    top = trends.get("sections", {}).get("all", {}).get("items", [])[:5]
    if top:
        lines += ["---", "", "## Trending right now", ""]
        lines += [f"- [{i['title']}]({i['link']}) ({i['source']})" for i in top]
        lines.append("")
    lines += ["---", "", f"[TRENDLINE]({SITE}/) · Independent fashion journalism"]
    return article["title"], "\n".join(lines)


def main():
    key = os.environ.get("BUTTONDOWN_API_KEY", "").strip()
    if not key:
        sys.exit("BUTTONDOWN_API_KEY is not set. Add it under Settings > Secrets and variables > Actions.")

    articles = read_json(ARTICLES, {}).get("articles", [])
    if not articles:
        print("No articles yet; nothing to send.")
        return
    latest = articles[0]
    state = read_json(STATE, {})
    if state.get("last_sent_slug") == latest.get("slug"):
        print("Newsletter for the latest article already created; nothing to do.")
        return

    subject, body = build_email(latest, read_json(TRENDS, {}))
    payload = json.dumps({"subject": subject, "body": body, "status": STATUS}).encode()
    req = urllib.request.Request(
        "https://api.buttondown.com/v1/emails", data=payload, method="POST",
        headers={"Authorization": f"Token {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(f"Buttondown accepted the email as '{STATUS}' (HTTP {resp.status}).")
    except urllib.error.HTTPError as err:
        sys.exit(f"Buttondown rejected the email: HTTP {err.code} {err.read().decode()[:500]}")

    state["last_sent_slug"] = latest["slug"]
    STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
