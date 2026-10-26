"""Rebuild the website's resource data from the files that actually exist.

Run from anywhere:  python tools/build_site_data.py

What it does
  1. Scans Student_Resources/<lesson>/ for PDF and DOCX files.
  2. Renders a small first-page thumbnail for every student PDF (site/img/thumbs/).
  3. Builds the download packs in downloads/:
       Grade7_Biology_Chapter4_Student_Pack.pdf      (all student PDFs, lesson order)
       Grade7_Biology_Chapter4_Student_Editable_DOCX.zip
  4. Lists the teacher-only files (names only, nothing is copied) from the
     private teacher folder, so the Teacher Zone can show what exists and
     where it is kept.
  5. Writes site/js/data.js, which every page reads.

Needs: Python 3.9+, pymupdf (pip install pymupdf).
"""
import json, os, re, sys, zipfile
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
STUDENT = ROOT / 'Student_Resources'
DOWNLOADS = ROOT / 'downloads'
THUMBS = ROOT / 'site' / 'img' / 'thumbs'
DATA_JS = ROOT / 'site' / 'js' / 'data.js'
# Teacher files stay OUTSIDE the public site. Only their names are read.
PRIVATE_TEACHER = ROOT.parent / 'Chapter_4_Prezi_3D_Final' / 'Teacher_Resources'
PRIVATE_PLANNER = ROOT.parent / 'Chapter_4_Water_and_Organic_Compounds_MYP_Year_3_Unit_Planner.docx'

LESSONS = [
    {'id': '4.1', 'folder': '4.1_Water', 'title': 'Water', 'pages': 'pp. 56–57',
     'objective': 'Explain the properties of water and its importance for living organisms.',
     'presentation': 'HTML_Presentations/4.1_Water/index.html', 'accent': 'blue',
     'image': 'site/img/lesson_4.1.jpg', 'imageAlt': 'A water strider standing on the surface of water',
     'keywords': 'surface tension solvent cohesion adhesion specific heat capacity states of water ice drops on a coin laboratory work 2'},
    {'id': '4.2', 'folder': '4.2_Chemical_Elements', 'title': 'Chemical Elements in Human Body', 'pages': 'pp. 58–59',
     'objective': 'Describe the role of micro- and macroelements in the life of organisms.',
     'presentation': 'HTML_Presentations/4.2_Chemical_Elements/index.html', 'accent': 'purple',
     'image': 'site/img/lesson_4.2.jpg', 'imageAlt': 'Human body organs surrounded by chemical element symbols',
     'keywords': 'element bioelements macroelement microelement calcium Ca phosphorus P potassium K iron Fe iodine I sodium Na deficiency'},
    {'id': '4.3', 'folder': '4.3_Organic_Compounds', 'title': 'Organic Compounds', 'pages': 'pp. 60–61',
     'objective': 'Determine the presence of carbohydrates, proteins, and lipids in foodstuffs.',
     'presentation': 'HTML_Presentations/4.3_Organic_Compounds/index.html', 'accent': 'coral',
     'image': 'site/img/lesson_4.3.jpg', 'imageAlt': 'Bread, eggs, nuts, salmon and oil — foods rich in carbohydrates, proteins and lipids',
     'keywords': 'organic molecule carbohydrate protein lipid fat starch iodine test paper test Biuret food tests laboratory work 3'},
    {'id': '4.4', 'folder': '4.4_Macroelements_in_Plants', 'title': 'Deficiency of Macroelements in Plants', 'pages': 'pp. 62–63',
     'objective': 'Learn the importance of macroelements and fertilizers for plants.',
     'presentation': 'HTML_Presentations/4.4_Macroelements_in_Plants/index.html', 'accent': 'green',
     'image': 'site/img/lesson_4.4.jpg', 'imageAlt': 'A healthy green plant next to a yellowing, nutrient-deficient leaf',
     'keywords': 'fertilizer deficiency synthetic nitrogen N phosphorus P potassium K magnesium Mg organic inorganic compost leaf symptoms'},
]

# filename pattern -> (category, resource type label)
STUDENT_KINDS = [
    (r'Vocabulary', 'vocabulary', 'Vocabulary sheet (English–Russian)'),
    (r'Lab\d', 'lab', 'Laboratory sheet'),
    (r'Worksheet', 'worksheets', 'Worksheet'),
    (r'Exit_Ticket', 'printables', 'Exit ticket (2 per page)'),
]
CATEGORIES = {
    'worksheets': 'Worksheets', 'lab': 'Lab Activities', 'vocabulary': 'Vocabulary', 'printables': 'Printables',
}


def nice_title(stem):
    t = re.sub(r'^\d\.\d_', '', stem).replace('_', ' ')
    t = t.replace('EN-RU', '(EN–RU)').replace('Lab2 Worksheet', 'Lab 2:').replace('Lab3 Worksheet', 'Lab 3:')
    t = re.sub(r'^Worksheet (.+)$', r'\1 Worksheet', t).replace('Element to Organ', 'Element-to-Organ')
    return re.sub(r'\s+', ' ', t).strip()


def rel(p):
    return p.relative_to(ROOT).as_posix()


def kb(p):
    return round(p.stat().st_size / 1024)


def student_resources():
    items = []
    for les in LESSONS:
        folder = STUDENT / les['folder']
        if not folder.is_dir():
            continue
        stems = sorted({p.stem for p in folder.iterdir() if p.suffix.lower() in ('.pdf', '.docx')})
        for stem in stems:
            kind = next(((c, label) for pat, c, label in STUDENT_KINDS if re.search(pat, stem)), ('printables', 'Printable'))
            pdf, docx = folder / (stem + '.pdf'), folder / (stem + '.docx')
            item = {'id': stem, 'lesson': les['id'], 'title': nice_title(stem), 'category': kind[0],
                    'type': kind[1], 'pdf': None, 'docx': None, 'pagesCount': None, 'thumb': None}
            if pdf.exists():
                doc = pymupdf.open(pdf)
                item.update(pdf=rel(pdf), pdfKB=kb(pdf), pagesCount=doc.page_count)
                THUMBS.mkdir(parents=True, exist_ok=True)
                thumb = THUMBS / (stem + '.png')
                pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(0.42, 0.42), alpha=False)
                pix.save(thumb)
                item['thumb'] = rel(thumb)
                doc.close()
            if docx.exists():
                item.update(docx=rel(docx), docxKB=kb(docx))
            items.append(item)
    return items


def build_packs(items):
    DOWNLOADS.mkdir(exist_ok=True)
    packs = {}
    pdfs = [ROOT / i['pdf'] for i in items if i['pdf']]
    if pdfs:
        out = DOWNLOADS / 'Grade7_Biology_Chapter4_Student_Pack.pdf'
        merged = pymupdf.open()
        toc = []
        for p in pdfs:
            d = pymupdf.open(p)
            toc.append([1, nice_title(p.stem) + ' — Lesson ' + p.stem[:3], merged.page_count + 1])
            merged.insert_pdf(d)
            d.close()
        merged.set_toc(toc)
        merged.set_metadata({'title': 'Grade 7 Biology · Chapter 4 · Student Pack', 'subject': 'Water and Organic Compounds'})
        merged.save(out, garbage=4, deflate=True)
        packs['studentPdf'] = {'href': rel(out), 'kb': kb(out), 'pages': merged.page_count, 'files': len(pdfs)}
        merged.close()
    docxs = [ROOT / i['docx'] for i in items if i['docx']]
    if docxs:
        out = DOWNLOADS / 'Grade7_Biology_Chapter4_Student_Editable_DOCX.zip'
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in docxs:
                z.write(p, 'Chapter4_Student_Editable_DOCX/' + p.parent.name + '/' + p.name)
        packs['editableDocx'] = {'href': rel(out), 'kb': kb(out), 'files': len(docxs)}
    return packs


def teacher_manifest():
    """Names of the teacher-only files. Nothing is copied into the public site."""
    rows = []

    def add(name, category, lesson, fmt):
        rows.append({'title': name, 'category': category, 'lesson': lesson, 'formats': fmt})

    if PRIVATE_TEACHER.is_dir():
        for p in sorted(PRIVATE_TEACHER.rglob('*')):
            if p.suffix.lower() != '.pdf':
                continue
            fmts = ['PDF'] + (['DOCX'] if p.with_suffix('.docx').exists() else [])
            lesson = p.stem[:3] if re.match(r'\d\.\d', p.stem) else 'All'
            if 'Answer_Key' in p.stem:
                add(nice_title(p.stem).replace(' TEACHER', ''), 'answer-keys', lesson, fmts)
            elif 'Teacher_Guide' in p.stem:
                add(nice_title(p.stem), 'guides', lesson, fmts)
            else:
                add(nice_title(p.stem), 'guides', lesson, fmts)
    if PRIVATE_PLANNER.exists():
        add('MYP Year 3 Unit Planner — Water and Organic Compounds', 'lesson-plans', 'All', ['DOCX'])
        add('Proposed summative tasks (Criteria A and C) — draft, in the Unit Planner', 'assessment', 'All', ['DOCX'])
    return rows


def main():
    items = student_resources()
    packs = build_packs(items)
    data = {
        'lessons': [{k: v for k, v in l.items() if k != 'folder'} for l in LESSONS],
        'categories': CATEGORIES,
        'resources': items,
        'packs': packs,
        'teacher': teacher_manifest(),
        'statementOfInquiry': 'Interactions among substances within living systems support essential functions, '
                              'and understanding these relationships can guide responsible use of natural resources.',
    }
    DATA_JS.parent.mkdir(parents=True, exist_ok=True)
    DATA_JS.write_text('/* Generated by tools/build_site_data.py — do not edit by hand. */\nwindow.SITE_DATA = '
                       + json.dumps(data, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    print(f'{len(items)} student resources, packs: {list(packs)}, teacher manifest: {len(data["teacher"])} rows')
    print('wrote', rel(DATA_JS))


if __name__ == '__main__':
    main()
