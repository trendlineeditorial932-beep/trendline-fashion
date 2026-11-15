# TRENDLINE automation: setup

| What | When | How |
|---|---|---|
| Trending headlines on every section | Daily, 06:00 India time | `daily-trends.yml` fetches headlines and writes `data/trends.json` |
| Long-form feature article | Weekly, Monday 08:30 India time | `weekly-article.yml` drafts it with Claude and opens a pull request. **Merging the pull request publishes it.** |
| Newsletter | When you merge the weekly article | `weekly-newsletter.yml` creates the email in Buttondown (as a draft you send, by default) |

## One-time setup (about 10 minutes)

1. **Let Actions open pull requests.** Repository > Settings > Actions > General > Workflow permissions: choose *Read and write permissions* and tick *Allow GitHub Actions to create and approve pull requests*. Save.
2. **Anthropic API key** (for the weekly article). Create a key at console.anthropic.com, then Settings > Secrets and variables > Actions > New repository secret, name `ANTHROPIC_API_KEY`. API use is billed, so ask a parent/guardian to set up billing. One feature a week is only a few cents.
3. **Buttondown** (for the newsletter). Create a free account at buttondown.com, then Settings > API and copy the key. Add it as a repository secret named `BUTTONDOWN_API_KEY`.
4. **Show the signup box.** In `config.js`, put your Buttondown username in `TRENDLINE_NEWSLETTER_USER` (the part after `buttondown.com/`).
5. **Run it once.** Actions tab > *Daily trends* > Run workflow. Then *Weekly article draft* > Run workflow. A pull request appears for you to review.

## Each week

Open the pull request, read the article (Files changed tab), check the "Claims to verify" list in the description, edit anything you want, then merge. The article goes live and a newsletter draft appears in Buttondown. Close the PR instead to skip a week.

To send newsletters automatically with no check, add a repository variable (Settings > Secrets and variables > Actions > Variables) named `NEWSLETTER_STATUS` with the value `about_to_send`.

## Notes

- Trend headlines come from Google News searches per section. Only the headline, source and link are stored; each links to the original publisher.
- Articles ship without photos. To add one, fill `imageUrl`, `imageCredit` and `imageLicence` in the pull request, only if you have permission to use the image.
- Change the schedule by editing the `cron:` lines in `.github/workflows/`. Times are UTC.
