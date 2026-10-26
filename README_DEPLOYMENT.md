# Grade 7 Biology · Chapter 4 website: how to publish on GitHub Pages

This folder is the whole website. It is static: HTML, CSS, JavaScript, images, fonts, PDF and DOCX files. It needs no server, database, build tool or paid service. All links are relative, so the site works at an address like `https://USERNAME.github.io/REPOSITORY/` and also when opened from a local folder.

```
Chapter_4_GitHub_Pages_Ready/
├── index.html               ← homepage (entry file)
├── resources.html           ← student resources (filters: ?lesson=4.1, ?type=vocabulary)
├── teacher-zone.html        ← Teacher Zone (lists teacher files; does not publish them)
├── about.html
├── .nojekyll                ← tells GitHub Pages to serve every file as it is
├── HTML_Presentations/      ← the four interactive presentations
├── Assets/                  ← presentation engine, 3D renders, fonts, original logos
├── Student_Resources/       ← student PDFs and DOCX files, one folder per lesson
├── downloads/               ← Student Pack (PDF) and Editable Files (DOCX ZIP)
├── site/                    ← website CSS, JavaScript, images, fonts, PDF thumbnails
└── tools/                   ← build scripts (not used by the live site)
```

## 1. Create a GitHub repository
1. Sign in at https://github.com (create a free account if you need one).
2. Click **+** (top right) → **New repository**.
3. Name it, for example `grade7-biology-chapter4`. The name becomes part of the address.
4. Choose **Public**. GitHub Pages on a free account needs a public repository, so everything in it can be seen by anyone.
5. Do not add a README, .gitignore or licence (this folder already has what it needs). Click **Create repository**.

## 2. Which files to upload
Upload **everything inside** `Chapter_4_GitHub_Pages_Ready`, including the hidden file `.nojekyll`. Do **not** upload the folder itself as one extra level. `index.html` must be at the top of the repository.

The folder is about 25 MB in about 275 files. The largest single file is about 5 MB, well under GitHub's limits.

## 3. Keep the folder structure
The pages find each other through relative paths such as `HTML_Presentations/4.1_Water/index.html` and `../../Assets/engine/prezi.js`. Keep every folder name exactly as it is.
**GitHub Pages is case-sensitive:** `Assets` and `assets` are different folders there, although Windows treats them as the same.

**Easiest way (web browser, no software):**
1. In the new empty repository, click **uploading an existing file**.
2. Open `Chapter_4_GitHub_Pages_Ready` in File Explorer, press **Ctrl+A**, and drag all files and folders into the browser window. Dragging folders keeps their structure.
3. Windows hides files that start with a dot. If `.nojekyll` is not in the list, add it later: **Add file → Create new file**, name it `.nojekyll`, leave it empty, and commit.
4. Click **Commit changes**. If the browser refuses that many files at once, upload in two or three batches (for example `Assets` first, then the rest).

**Alternative (GitHub Desktop or git):** clone the empty repository, copy the contents of this folder into it, then commit and push.

## 4. Turn on GitHub Pages
1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. **Branch:** `main`. **Folder:** `/ (root)`. Click **Save**.

## 5. Find the published address
After 1–3 minutes, **Settings → Pages** shows *"Your site is live at https://USERNAME.github.io/REPOSITORY/"*. Click **Visit site**. Each new commit republishes automatically in about a minute. The **Actions** tab shows the progress of each publish.

## 6. Test on iPad Safari
1. Open the address in Safari on the iPad.
2. Check that the homepage shows the four lesson cards (two per row in portrait and in landscape) and that the menu button (☰) opens the navigation.
3. Tap **Open Presentation** on each card. Move through the scenes with the arrow buttons in the bottom control bar, and try the overview (house) button and the answer (eye) button.
4. Tap the round **‹** button at the bottom left of a presentation. It returns to the Chapter 4 homepage.
5. Tap **Student Materials** → **View PDF**. The PDF opens in Safari. **Word (DOCX)** downloads the file into the Files app.
6. Optional: **Share → Add to Home Screen** opens the site like an app.

The site was tested in Chrome on Windows at iPad sizes (1024×768 and 768×1024, including 2× pixel density). It has not been tested on a real iPad yet, so do this check before class.

## 7. Update a presentation later
1. Edit the presentation in your original project (`Chapter_4_Prezi_3D_Final/HTML_Presentations/...`).
2. Copy the new `index.html` into the same folder here, for example `HTML_Presentations/4.1_Water/index.html`. Copy any new or changed images into the matching `Assets/...` folder.
3. Add this line just before `</body>` in the copied `index.html`. It puts back the "Back to Chapter 4" button:
   ```html
   <script src="../../site/js/back-to-chapter.js"></script>
   ```
4. Upload the changed files to the same paths in the repository (on GitHub, open the folder → **Add file → Upload files**). Uploading a file with the same name replaces it.

## 8. Add or replace student resources
1. Put the files into `Student_Resources/<lesson folder>/`, using the same naming style as now, for example `4.2_Worksheet_Body_Map.pdf` and `4.2_Worksheet_Body_Map.docx`. The words in the name set the category: `Vocabulary` → Vocabulary, `Lab2`/`Lab3` → Lab Activities, `Worksheet` → Worksheets, `Exit_Ticket` → Printables.
2. Rebuild the lists, thumbnails and packs. On the computer, in this folder, run:
   ```
   pip install pymupdf
   python tools/build_site.py
   ```
   This rescans the folders. It updates `site/js/data.js`, the PDF thumbnails, the Student Pack PDF and the DOCX ZIP, and rewrites `index.html`, `resources.html`, `teacher-zone.html` and `about.html`.
3. Upload the new resource files and every file the script changed.

Lesson titles, objectives and pictures are set in `tools/build_site_data.py` (the `LESSONS` list). The page layout is in `tools/build_site.py` and `site/css/site.css`. If you edit the HTML pages directly, the next run of `build_site.py` will overwrite those edits.

## 9. Keep teacher materials out of public hosting
- **Never** put answer keys, teacher guides, the unit planner or draft assessments in this folder or the repository. GitHub Pages is public: anyone with the address can open every file, and an unlisted link or a JavaScript password does not protect anything.
- The teacher files stay in your private project folder `Chapter_4_Prezi_3D_Final/Teacher_Resources/` and in the unit planner `.docx`. The build script reads **only their names**, so the Teacher Zone can list them. It never copies them.
- To share them with colleagues, upload them to school-controlled storage with staff-only access (for example school Google Drive or Microsoft 365). Then open `site/js/config.js` and paste the link:
  ```js
  teacherStorageUrl: 'https://...your staff-only folder link...',
  ```
  The Teacher Zone will then show a button to that folder. Staff sign-in is handled by the storage service.
- Before each upload, check that no `*Answer_Key*`, `*Teacher_Guide*` or `*Planner*` file has been added to this folder.
- The presentations contain teacher notes (key **T**) and hidden answers (key **A**) for formative class activities. Anyone who opens a lesson can show them, so do not put summative assessment answers in the presentations.
