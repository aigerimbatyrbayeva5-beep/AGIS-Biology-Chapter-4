"""Build the whole static website.

    python tools/build_site.py

1. Runs build_site_data.py (scans the resource folders, thumbnails, packs, data.js).
2. Writes index.html, resources.html, teacher-zone.html and about.html from that data,
   so every list on the site matches the files that really exist.
All links are relative, so the site works at https://USER.github.io/REPO/ and offline.
"""
import json, sys
from html import escape as e
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_site_data

ROOT = build_site_data.ROOT
TITLE = 'Grade 7 Biology · Chapter 4 · Water and Organic Compounds · AGIS'

ICONS = {
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.6-4.6"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'close': '<path d="M6 6l12 12M18 6L6 18"/>',
    'play': '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z"/>',
    'doc': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'bulb': '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path d="M12 1v-.5M4.2 4.2l-.7-.7M19.8 4.2l.7-.7M2 11h-.8M22.8 11H22"/>',
    'folder': '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    'users': '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 19.5c.6-3.6 3.3-5.6 6.5-5.6s5.9 2 6.5 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.8 13.9c2.6.1 4.3 1.8 4.7 4.6"/>',
    'download': '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
    'chev': '<path d="M9 5l7 7-7 7"/>',
    'back': '<path d="M15 18l-6-6 6-6"/>',
    'sheet': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/><rect x="8.5" y="7" width="0" height="0"/>',
    'flask': '<path d="M9 3h6M10 3v6.2L4.8 18.4A1.7 1.7 0 0 0 6.3 21h11.4a1.7 1.7 0 0 0 1.5-2.6L14 9.2V3"/><path d="M7.2 15h9.6"/>',
    'az': '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7 15.5l2.2-7 2.2 7M7.7 13.3h3M13.6 9h3.6l-3.6 6.5h3.6"/>',
    'print': '<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/><circle cx="17.5" cy="12" r=".6"/>',
    'book': '<path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8V19c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z"/><path d="M12 6.3v13.5"/>',
    'key': '<circle cx="8" cy="15" r="4"/><path d="M10.9 12.1L19 4M15.5 7.5l2.5 2.5M17.5 5.5l2 2"/>',
    'list': '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    'chart': '<path d="M3 20h18"/><path d="M4 16l5-6 4 3.5L20 5"/><path d="M16 5h4v4"/>',
    'lock': '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    'eye': '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    'ext': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
}


def ic(name, cls='i', extra=''):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true"{extra}>{ICONS[name]}</svg>'


def doc_icon(kind):
    """Coloured file badge used on the download tiles (PDF red, Word blue)."""
    if kind == 'pdf':
        return ('<svg class="doc" viewBox="0 0 24 30" aria-hidden="true"><path d="M3 1h12l8 8v18a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="#ef4237"/>'
                '<path d="M15 1v6a2 2 0 0 0 2 2h6" fill="#f99a93"/><path d="M6 15h12M6 19h12M6 23h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>')
    return ('<svg class="doc" viewBox="0 0 24 30" aria-hidden="true"><rect x="1" y="2" width="22" height="26" rx="3" fill="#1f6fe5"/>'
            '<path d="M5.5 9l2.2 12 2.6-8.5 2.4 8.5L15.4 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" transform="translate(1.2 0)"/></svg>')


NAV = [('index.html', 'Home', 'home'), ('index.html#lessons', 'Lessons', 'lessons'), ('resources.html', 'Resources', 'resources'),
       ('teacher-zone.html', 'Teacher Zone', 'teacher'), ('about.html', 'About', 'about')]


def head(title, desc):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#0184fd">
<link rel="icon" type="image/png" href="site/img/agis_emblem.png">
<link rel="preload" href="site/fonts/jakarta-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="site/fonts/jakarta-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="site/css/site.css">
</head>
'''


def header(active):
    links = '\n'.join(
        f'      <a href="{h}"{" aria-current=\"page\"" if key == active else ""}>{label}</a>' for h, label, key in NAV)
    return f'''<body data-page="{active}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="index.html" aria-label="AGIS — Astana Garden International School, Chapter 4 home">
      <img class="emblem" src="site/img/agis_emblem.png" width="90" height="90" alt="">
      <span class="words"><span class="agis">AGIS</span><span class="school">Astana Garden<br>International School</span></span>
    </a>
    <span class="myp"><img src="Assets/logos/IB_MYP_logo.png" width="195" height="78" alt="IB Middle Years Programme"></span>
    <nav class="nav" id="site-nav" aria-label="Main">
{links}
    </nav>
    <button class="menu-btn" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu">{ic('menu')}</button>
    <button class="search-btn" type="button" data-open-search aria-label="Search lessons and resources" title="Search (press /)">{ic('search')}</button>
  </div>
</header>
'''


FOOTER = '''<footer class="site-footer">
  <div class="wrap">
    <span>Astana Garden International School · Grade 7 Biology · IB MYP Sciences Year 3 · Chapter 4, textbook pp. 54–63</span>
    <span><a href="about.html">About this site</a> · <a href="resources.html">Student resources</a> · <a href="teacher-zone.html">Teacher Zone</a></span>
  </div>
</footer>
<dialog class="search-dlg" id="search" aria-label="Search">
  <form method="dialog" role="search">
    SEARCH_ICON
    <label class="sr-only" for="q">Search lessons, objectives and resources</label>
    <input id="q" type="search" autocomplete="off" placeholder="Search lessons, topics, worksheets…" aria-controls="results">
    <button class="close" value="close" type="submit">Esc</button>
  </form>
  <ul class="results" id="results" aria-live="polite"></ul>
</dialog>
<script src="site/js/config.js"></script>
<script src="site/js/data.js"></script>
<script src="site/js/app.js"></script>
</body>
</html>
'''.replace('SEARCH_ICON', ic('search'))


def lesson_by_id(data):
    return {l['id']: l for l in data['lessons']}


# ---------------------------------------------------------------- index.html
def page_index(data):
    soi = data['statementOfInquiry']
    cards = []
    for l in data['lessons']:
        bubble = '<span class="el-bubble" aria-hidden="true">P</span>' if l['id'] == '4.2' else ''
        cards.append(f'''    <article class="card {l['accent']}" id="lesson-{l['id']}">
      <div class="cover"><img src="{l['image']}" width="644" height="348" alt="{e(l['imageAlt'])}">{bubble}</div>
      <div class="body">
        <span class="num" aria-hidden="true">{l['id']}</span>
        <h3><span class="sr-only">Lesson {l['id']}: </span>{e(l['title']).replace(' in Human Body', ' <span class="br">in Human Body</span>')}</h3>
        <div class="dur">{ic('clock')}<span>40 minutes</span></div>
        <p class="obj">{e(l['objective'])}</p>
        <div class="actions">
          <a class="btn solid" href="{l['presentation']}">{ic('play')}<span>Open Presentation</span></a>
          <a class="btn line" href="resources.html?lesson={l['id']}">{ic('doc')}<span>Student Materials</span></a>
        </div>
      </div>
    </article>''')
    cats = [('worksheets', 'Worksheets', 'sheet'), ('lab', 'Lab Activities', 'flask'), ('vocabulary', 'Vocabulary', 'az'), ('printables', 'Printables', 'print')]
    stu_tiles = '\n'.join(f'        <a class="tile" href="resources.html?type={k}">{ic(i)}<span>{lab}</span></a>' for k, lab, i in cats)
    tcats = [('guides', 'Teacher Guides', 'book'), ('answer-keys', 'Answer Keys', 'key'), ('lesson-plans', 'Lesson Plans', 'list'), ('assessment', 'Assessment', 'chart')]
    tea_tiles = '\n'.join(f'        <a class="tile" href="teacher-zone.html#{k}">{ic(i)}<span>{lab}</span></a>' for k, lab, i in tcats)
    p = data['packs']
    dl = []
    if 'studentPdf' in p:
        dl.append(f'<a class="tile" href="{p["studentPdf"]["href"]}" download title="{p["studentPdf"]["pages"]} pages · {p["studentPdf"]["kb"] // 1024 or 1} MB">{doc_icon("pdf")}<span>Student Pack<br>(PDF)</span></a>')
    dl.append(f'<a class="tile" href="teacher-zone.html#teacher-pack" title="Teacher files are kept off the public website">{doc_icon("pdf")}<span>Teacher Pack<br>(PDF)</span></a>')
    if 'editableDocx' in p:
        dl.append(f'<a class="tile" href="{p["editableDocx"]["href"]}" download title="ZIP · {p["editableDocx"]["files"]} Word files">{doc_icon("docx")}<span>Editable Files<br>(DOCX)</span></a>')
    dl_tiles = '\n'.join('        ' + x for x in dl)
    return head(TITLE, 'Grade 7 Biology, Chapter 4: Water and Organic Compounds — four interactive lessons with student resources. IB MYP Sciences Year 3, AGIS.') + header('home') + f'''<main id="main">
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap">
    <p class="grade">Grade 7 Biology</p>
    <h1 id="hero-title">Chapter 4 <span class="sub">Water and Organic Compounds</span></h1>
    <p class="meta">IB MYP Sciences Year 3<span aria-hidden="true">|</span>AGIS</p>
    <div class="soi" role="note" aria-labelledby="soi-h">
      {ic('bulb', 'i bulb')}
      <div><h2 id="soi-h">Statement of Inquiry</h2><p>{e(soi)}</p></div>
    </div>
  </div>
</section>

<section class="lessons wrap" id="lessons" aria-label="Lessons">
  <div class="cards">
{chr(10).join(cards)}
  </div>
</section>

<section class="wrap panels" aria-label="Resources and downloads">
  <div class="panel stu">
    <a class="panel-head" href="resources.html">
      <span class="ic">{ic('folder', 'i fill')}</span>
      <span><h2>Student Resources</h2><p>Worksheets, vocabulary, lab sheets and activities</p></span>
      {ic('chev', 'i chev')}
    </a>
    <div class="tiles">
{stu_tiles}
    </div>
  </div>
  <div class="panel tea">
    <a class="panel-head" href="teacher-zone.html">
      <span class="ic">{ic('users')}</span>
      <span><h2>Teacher Resources</h2><p>Guides, answer keys and lesson plans</p></span>
      {ic('chev', 'i chev')}
    </a>
    <div class="tiles">
{tea_tiles}
    </div>
  </div>
  <div class="panel dl" id="downloads">
    <a class="panel-head" href="resources.html#packs">
      <span class="ic">{ic('download')}</span>
      <span><h2>Download All Materials</h2><p>Complete Chapter 4 resource pack</p></span>
      {ic('chev', 'i chev')}
    </a>
    <div class="tiles">
{dl_tiles}
    </div>
  </div>
</section>
</main>
''' + FOOTER


# ------------------------------------------------------------ resources.html
def res_card(r, lessons):
    l = lessons[r['lesson']]
    thumb = f'<a class="thumb" href="{r["pdf"]}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><img src="{r["thumb"]}" alt="" loading="lazy" width="92" height="130"></a>' if r.get('thumb') else ''
    links = []
    if r.get('pdf'):
        links.append(f'<a class="v" href="{r["pdf"]}" target="_blank" rel="noopener">{ic("eye")}View PDF<span class="sr-only"> — {e(r["title"])}, lesson {r["lesson"]}</span></a>')
    if r.get('docx'):
        links.append(f'<a class="d" href="{r["docx"]}" download>{ic("download")}Word (DOCX)<span class="sr-only"> — {e(r["title"])}, lesson {r["lesson"]}</span></a>')
    meta = [r['type']]
    if r.get('pagesCount'):
        meta.append(f'{r["pagesCount"]} page' + ('s' if r['pagesCount'] > 1 else ''))
    return f'''      <article class="res {l['accent']}" data-lesson="{r['lesson']}" data-type="{r['category']}" id="{r['id']}">
        {thumb}
        <div class="info">
          <span class="tag" title="{e(l['title'])}">Lesson {r['lesson']}</span>
          <h3>{e(r['title'])}</h3>
          <span class="type">{e(' · '.join(meta))}</span>
          <div class="links">{''.join(links)}</div>
        </div>
      </article>'''


def page_resources(data):
    lessons = lesson_by_id(data)
    chips_l = '<button class="chip" type="button" data-f="lesson" data-v="" aria-pressed="true">All lessons</button>' + ''.join(
        f'<button class="chip {l["accent"]}" type="button" data-f="lesson" data-v="{l["id"]}" aria-pressed="false"><span class="dot"></span>{l["id"]} {e(l["title"])}</button>'
        for l in data['lessons'])
    chips_t = '<button class="chip" type="button" data-f="type" data-v="" aria-pressed="true">All types</button>' + ''.join(
        f'<button class="chip" type="button" data-f="type" data-v="{k}" aria-pressed="false">{e(v)}</button>' for k, v in data['categories'].items())
    cards = '\n'.join(res_card(r, lessons) for r in data['resources'])
    p = data['packs']
    packs = []
    if 'studentPdf' in p:
        s = p['studentPdf']
        packs.append(f'<article class="res blue"><div class="info"><span class="tag">Whole chapter</span><h3>Student Pack (PDF)</h3><span class="type">All {s["files"]} student sheets in one printable file · {s["pages"]} pages · {round(s["kb"] / 1024, 1)} MB</span><div class="links"><a class="v" href="{s["href"]}" target="_blank" rel="noopener">{ic("eye")}View PDF</a><a class="d" href="{s["href"]}" download>{ic("download")}Download</a></div></div></article>')
    if 'editableDocx' in p:
        s = p['editableDocx']
        packs.append(f'<article class="res purple"><div class="info"><span class="tag">Whole chapter</span><h3>Editable Files (DOCX)</h3><span class="type">ZIP with {s["files"]} Word files, one folder per lesson · {round(s["kb"] / 1024, 1)} MB</span><div class="links"><a class="d" href="{s["href"]}" download>{ic("download")}Download ZIP</a></div></div></article>')
    packs.append(f'<article class="res coral"><div class="info"><span class="tag">Teachers</span><h3>Teacher Pack (PDF)</h3><span class="type">Not published on this public website — answer keys and teacher guides are kept in private storage.</span><div class="links"><a class="d" href="teacher-zone.html#teacher-pack">{ic("lock")}Why? Open Teacher Zone</a></div></div></article>')
    return head('Student Resources · Chapter 4 · AGIS', 'Worksheets, laboratory sheets, English–Russian vocabulary and exit tickets for Grade 7 Biology Chapter 4.') + header('resources') + f'''<main id="main">
<section class="page-hero">
  <div class="wrap">
    <p class="crumbs"><a href="index.html">Home</a> › Student Resources</p>
    <h1>Student Resources</h1>
    <p class="lead">Worksheets, lab sheets, English–Russian vocabulary and exit tickets for Chapter 4. Open a PDF to print it, or download the Word file to type in it.</p>
  </div>
</section>
<section class="section wrap">
  <div class="filters" role="group" aria-label="Filter resources">
    <div class="chips"><span class="lab">Lesson</span>{chips_l}</div>
    <div class="chips"><span class="lab">Type</span>{chips_t}</div>
  </div>
  <p class="count" id="count" aria-live="polite">{len(data['resources'])} resources</p>
  <div class="res-grid" id="res-grid">
{cards}
  </div>
  <div class="empty" id="empty" hidden>No files of this type for this lesson. <button class="chip" type="button" data-reset>Show all resources</button></div>

  <h2 class="h2" id="packs" style="margin-top:44px">Download all materials</h2>
  <div class="res-grid">
    {''.join(packs)}
  </div>
  <p style="margin-top:28px"><a class="chip" href="index.html">{ic('back')}Back to Chapter 4 home</a></p>
</section>
</main>
''' + FOOTER


# --------------------------------------------------------- teacher-zone.html
def page_teacher(data):
    lessons = lesson_by_id(data)
    groups = [('guides', 'Teacher Guides', 'book'), ('answer-keys', 'Answer Keys', 'key'),
              ('lesson-plans', 'Lesson Plans', 'list'), ('assessment', 'Assessment', 'chart')]
    sections = []
    for k, label, icon in groups:
        rows = [t for t in data['teacher'] if t['category'] == k]
        trs = ''.join(
            f'<tr><td><b>{e(t["title"])}</b></td><td>{"Lesson " + t["lesson"] + " · " + e(lessons[t["lesson"]]["title"]) if t["lesson"] in lessons else "Whole chapter"}</td>'
            f'<td>{" + ".join(t["formats"])}</td><td><span class="pill lock">{ic("lock")}Secure hosting required</span></td></tr>' for t in rows)
        extra = ''
        if k == 'assessment':
            ex = [r for r in data['resources'] if r['category'] == 'printables']
            trs += ''.join(
                f'<tr><td><b>{e(r["title"])}</b> (student copy)</td><td>Lesson {r["lesson"]} · {e(lessons[r["lesson"]]["title"])}</td><td>PDF + DOCX</td>'
                f'<td><a class="pill ok" href="{r["pdf"]}" target="_blank" rel="noopener">{ic("eye")}Public — open PDF</a></td></tr>' for r in ex)
            extra = '<p class="count">Exit tickets are formative and student-facing, so they are public. Their answers are in the answer keys.</p>'
        body = (f'<table class="t-table"><thead><tr><th>File</th><th>Lesson</th><th>Formats</th><th>Status</th></tr></thead><tbody>{trs}</tbody></table>'
                if trs else '<div class="empty">No files in this category yet.</div>')
        sections.append(f'<h2 class="h2" id="{k}">{ic(icon)} {label}</h2>{extra}{body}')
    return head('Teacher Zone · Chapter 4 · AGIS', 'Teacher resources for Grade 7 Biology Chapter 4: guides, answer keys, lesson plans and assessment.') + header('teacher') + f'''<main id="main">
<section class="page-hero">
  <div class="wrap">
    <p class="crumbs"><a href="index.html">Home</a> › Teacher Zone</p>
    <h1>Teacher Zone</h1>
    <p class="lead">Teacher guides, answer keys, the unit planner and assessment notes for Chapter 4 — and how to use the four presentations in class.</p>
  </div>
</section>
<section class="section wrap">
  <div class="notice warn">{ic('lock')}<div><strong>Teacher files are not on this public website.</strong> This site is static and public: anyone with the link can open every file in it, and a password typed into a web page would not protect them. Answer keys, teacher guides and the draft unit planner are therefore kept in private storage. The list below shows what exists, so you know what to ask for.</div></div>
  <div id="storage" style="margin-top:14px"></div>

  <h2 class="h2" id="teacher-pack" style="margin-top:34px">{ic('download')} Teacher Pack (PDF)</h2>
  <div class="box"><p>A combined Teacher Pack is not published here, because it would contain the answer keys. The teacher guides and answer keys (PDF and DOCX) are in the teacher&#8217;s private Chapter 4 project folder, <code>Chapter_4_Prezi_3D_Final/Teacher_Resources/</code>. To share them with colleagues, upload that folder to school-controlled storage (for example the school Google Drive or Microsoft 365 with staff-only sharing) and add the link in <code>site/js/config.js</code> — a button to it will then appear on this page.</p></div>

  {''.join(sections)}

  <h2 class="h2" id="presenting">Presenting the lessons</h2>
  <div class="grid2">
    <div class="box"><h3>Keyboard</h3><ul>
      <li><kbd>→</kbd> / <kbd>Space</kbd> next reveal or scene · <kbd>←</kbd> back</li>
      <li><kbd>O</kbd> or <kbd>Home</kbd> overview map · <kbd>End</kbd> exit ticket</li>
      <li><kbd>A</kbd> reveal / hide answers · <kbd>R</kbd> reset the scene</li>
      <li><kbd>T</kbd> teacher notes (hidden by default) · <kbd>M</kbd> reduced motion</li>
      <li><kbd>F</kbd> full screen · <kbd>H</kbd> help</li></ul></div>
    <div class="box"><h3>Good to know</h3><ul>
      <li>Answers stay hidden until you press <kbd>A</kbd> or a Reveal button.</li>
      <li>The teacher-notes drawer is part of each presentation. Students who open a lesson on their own device can open it too, so do not put assessment answers in it.</li>
      <li>A lesson reopens on the same scene after a refresh. The 4.1 class results table is saved in the browser of that device.</li>
      <li>The <b>Chapter 4</b> button in the top-left corner of every presentation returns to this website.</li></ul></div>
  </div>
  <div class="lesson-list" style="margin-top:18px">
    {''.join(f'<div class="lesson-row {l["accent"]}"><img src="{l["image"]}" alt=""><div><h3>{l["id"]} {e(l["title"])}</h3><p>{e(l["objective"])} · Textbook {l["pages"]}</p></div><div class="acts"><a class="btn solid" href="{l["presentation"]}">{ic("play")}Open Presentation</a><a class="btn line" href="resources.html?lesson={l["id"]}">{ic("doc")}Student Materials</a></div></div>' for l in data['lessons'])}
  </div>
</section>
</main>
''' + FOOTER


# ---------------------------------------------------------------- about.html
def page_about(data):
    n = len(data['resources'])
    return head('About · Chapter 4 · AGIS', 'About the Grade 7 Biology Chapter 4 learning website at Astana Garden International School.') + header('about') + f'''<main id="main">
<section class="page-hero">
  <div class="wrap">
    <p class="crumbs"><a href="index.html">Home</a> › About</p>
    <h1>About this website</h1>
    <p class="lead">The learning website for Chapter 4, <i>Water and Organic Compounds</i>, of the Grade 7 Biology course at Astana Garden International School (IB MYP Sciences, Year 3).</p>
  </div>
</section>
<section class="section wrap">
  <div class="grid2">
    <div class="box"><h3>What is here</h3><ul>
      <li><b>Four interactive presentations</b> (40 minutes each) that zoom between scenes, with activities, vocabulary and teacher-controlled answers.</li>
      <li><b>{n} student resources</b>: worksheets, laboratory sheets, English–Russian vocabulary sheets and exit tickets, as PDF to print and DOCX to edit.</li>
      <li>A <b>Teacher Zone</b> that lists the teacher files and explains how they are kept private.</li></ul></div>
    <div class="box"><h3>The unit</h3>
      <p><b>Statement of Inquiry:</b> {e(data['statementOfInquiry'])}</p>
      <p>Key concept: Systems · Related concepts: Function, Interaction · Global context: Globalization and sustainability (from the unit planner, proposed — subject to department approval).</p>
      <p>Textbook: Biology Grade 7, Chapter 4, pp. 54–63.</p></div>
  </div>
  <h2 class="h2">Lessons</h2>
  <div class="lesson-list">
    {''.join(f'<div class="lesson-row {l["accent"]}"><img src="{l["image"]}" alt=""><div><h3>{l["id"]} {e(l["title"])}</h3><p>{e(l["objective"])} · Textbook {l["pages"]}</p></div><div class="acts"><a class="btn solid" href="{l["presentation"]}">{ic("play")}Open Presentation</a></div></div>' for l in data['lessons'])}
  </div>
  <h2 class="h2">Using the site</h2>
  <div class="grid2">
    <div class="box"><h3>Devices</h3><p>Works in current Chrome, Edge, Safari (including iPad) and Firefox. The presentations work best on a laptop, desktop or tablet in landscape; on a phone, turn the phone sideways. On a touch screen, use the control bar at the bottom of a presentation.</p></div>
    <div class="box"><h3>Credits</h3><p>Lessons, presentations and worksheets: Grade 7 Biology teachers, AGIS. The AGIS logo belongs to Astana Garden International School; the IB MYP logo belongs to the International Baccalaureate Organization and is used to identify the programme. Fonts: Plus Jakarta Sans, Cinzel, Nunito and Fredoka (SIL Open Font License).</p></div>
  </div>
</section>
</main>
''' + FOOTER


def main():
    build_site_data.main()
    data = json.loads(build_site_data.DATA_JS.read_text(encoding='utf-8').split('window.SITE_DATA = ', 1)[1].rstrip().rstrip(';'))
    pages = {'index.html': page_index, 'resources.html': page_resources,
             'teacher-zone.html': page_teacher, 'about.html': page_about}
    for name, fn in pages.items():
        (ROOT / name).write_text(fn(data), encoding='utf-8')
        print('wrote', name)


if __name__ == '__main__':
    main()
