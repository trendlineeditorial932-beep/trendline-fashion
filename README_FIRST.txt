TRENDLINE — VISUAL REDESIGN BUNDLE

WHAT'S INSIDE
- index.html: high-impact visual homepage
- 10 category pages: Streetwear, Swimwear, Luxury, Sportswear, Casualwear, Formalwear, Sustainable fashion, Vintage, Accessories and Lingerie
- article.html: article detail page
- styles.css: responsive editorial design, high-contrast palette and mobile layout
- app.js: mobile navigation, search and approved-article feed loader
- config.js: place for the Google Apps Script /exec URL
- APPS_SCRIPT_CODE.txt: updated full Apps Script code, including Lingerie research feed
- IMAGE_CREDITS.txt: image authors and source pages

VISUAL DIRECTION
Near-black (#0C0C0D) + warm paper (#F4F1E8), with electric lime (#D9FF00), vivid orange (#FF3B30) and cyan (#35C5FF) as limited accents. The bright accents are used for labels and calls to action, not long paragraphs. The site relies on fashion photography, large condensed headlines, asymmetric grids and visual category tiles.

HOW IMAGES WORK
Images are loaded from Unsplash's image CDN and are credited in IMAGE_CREDITS.txt. Each corresponding photo page identified the photo as free to use under the Unsplash License at the time this bundle was built. The site therefore needs an internet connection to display them. Check image terms again before any commercial use; do not imply the images are TRENDLINE's own photography.

UPLOAD TO GITHUB PAGES FROM ANDROID
1. Download and extract TRENDLINE_Visual_Redesign.zip.
2. Open your GitHub repository in Chrome and enable Desktop site if needed.
3. Choose Add file > Upload files.
4. Upload every file from the extracted folder into the repository root (the same level where index.html currently sits). Do not upload the entire folder as one nested folder.
5. Commit the changes. Replace existing files when GitHub asks.
6. Wait for Pages to rebuild, then refresh the existing TRENDLINE website address.

CONNECT THE EDITORIAL FEED
1. APPS_SCRIPT_CODE.txt is a complete updated script that adds a Lingerie research feed and serves only original Articles with Status = Approved. Existing sheet rows are preserved.
2. Replacing Apps Script code is optional at first: the website can publish manually added Lingerie articles even before the research feed is updated. To add Lingerie to automatic private research collection, ask a parent/guardian to review the script permissions, then replace the entire Code.gs with this file, save, and run setupTrendline once. This recreates the six-hour trigger.
3. Deploy the script as a Web app with access suitable for your public website only after parent/guardian review. Do not make the spreadsheet public. Copy the URL ending /exec.
4. In config.js, replace the empty string in window.TRENDLINE_API_URL with your /exec URL. Commit that one file.
5. Add original articles in the Articles tab. Category should match a page label. Add an image URL only when you have permission; credit it and record its licence. Set Status to Approved.

IMPORTANT
- The private Stories feed is for research leads only. Do not republish Google News headlines, article text or photos automatically.
- The public site shows original TRENDLINE articles only after editorial approval. It does not auto-write or auto-publish articles.
- Trend cards on the homepage are a dated editorial snapshot (13 November 2026) and should be refreshed when you review new fashion coverage.
- The site is a static GitHub Pages site; live feed loading requires the Apps Script URL to be added to config.js.
