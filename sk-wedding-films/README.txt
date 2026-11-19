SK WEDDING FILMS - PORTFOLIO WEBSITE
====================================
Open index.html in a browser to preview. No installation or build step is needed.
Keep the "images" and "videos" folders next to index.html.

PAGE ORDER
Hero > highlights bar > "Book Your Special Day" steps > Featured Stories (first 3 photos) >
Services > Founder > "Ready to Create Your Dream Wedding Story?" bar > Photography Gallery
(filters + full-screen viewer) > Wedding Films > About / Experience / Skills > Contact > Footer.
Reels and School Events sections appear automatically once you add reels or school work.

ADDING MORE WORK (two ways)
A) Easy way - the admin page (recommended for Sathish):
   Open  yourwebsite.com/admin.html , sign in with satish.ok65@gmail.com, choose Photos / Films /
   Reels / School events, pick files or paste a YouTube / Instagram link, press "Add to website".
   It appears on the public site straight away. One-time setup: follow ADMIN-SETUP.txt
   (free Supabase account, run supabase-setup.sql, paste the two keys into config.js).
B) Manual way: put files in "images" / "videos", add a line in media.js, upload the folder again.
   The site shows both lists together.

FILES
index.html, styles.css, app.js ... the website
admin.html, admin.css, admin.js ... the owner page (noindex, not linked from the site)
config.js ... the two Supabase values (empty until you finish ADMIN-SETUP.txt)
supabase-setup.sql ... database + storage rules (only satish.ok65@gmail.com can change anything)

PUBLISHING
Upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
The contact form can send by email (satish.ok65@gmail.com) or by WhatsApp (+91 7207187193).
