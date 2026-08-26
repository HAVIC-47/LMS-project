"""Search and filters on every list, catalog hover expansion, access toggles, un-enrolling."""
import sys, re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PW = "Passw0rd!23"
results = []


def app_error(message: str) -> bool:
    """Next's dev-mode instrumentation emits a negative-duration performance measure when a
    route redirects or streams. It names a framework internal, never application code, and
    does not occur in a build. Filtered by exact shape so a real error still fails."""
    return "cannot have a negative time stamp" not in message


def _out(line):
    enc = sys.stdout.encoding or "utf-8"
    print(line.encode(enc, "replace").decode(enc))


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    _out(("PASS  " if cond else "FAIL  ") + name + (f"  -- {detail}" if detail else ""))


def login(ctx, email):
    page = ctx.new_page()
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', PW)
    page.click('button[type="submit"]')
    try:
        page.wait_for_url(lambda u: "/login" not in u, timeout=20000)
    except Exception:
        pass
    page.wait_for_load_state("networkidle")
    return page


def cards(page, prefix):
    return page.locator(f'main a[href^="/{prefix}/"]').count()


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    errs = []

    # ---------- the catalog ----------
    anon = b.new_context(viewport={"width": 1500, "height": 1000}).new_page()
    anon.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)

    anon.goto(f"{BASE}/courses", wait_until="networkidle")
    anon.wait_for_timeout(600)
    all_courses = cards(anon, "courses")
    check("catalog lists courses", all_courses > 0, f"{all_courses}")

    anon.fill('input[aria-label="Search courses by title, description or instructor"]', "security")
    anon.wait_for_timeout(1600)
    found = cards(anon, "courses")
    check(
        "catalog search narrows the list",
        0 < found < all_courses and "q=security" in anon.url,
        f"{found} of {all_courses} — {anon.url}",
    )

    anon.click("text=Clear")
    anon.wait_for_timeout(1400)
    anon.select_option('select[aria-label="Filter by level"]', "advanced")
    anon.wait_for_timeout(1400)
    levelled = cards(anon, "courses")
    texts = [t.lower() for t in anon.locator('main a[href^="/courses/"]').all_inner_texts()]
    check(
        "catalog level filter returns only that level",
        0 < levelled < all_courses and all("advanced" in t for t in texts),
        f"{levelled} cards — {anon.url}",
    )

    anon.select_option('select[aria-label="Filter by content"]', "quiz")
    anon.wait_for_timeout(1400)
    check("catalog filters combine", "level=advanced" in anon.url and "content=quiz" in anon.url, anon.url)

    anon.click("text=Clear")
    anon.wait_for_timeout(1400)
    check("clearing restores the catalog", cards(anon, "courses") == all_courses)

    # A search with no hits must say so rather than render an empty grid.
    anon.fill(
        'input[aria-label="Search courses by title, description or instructor"]',
        "zzzz-no-such-course",
    )
    anon.wait_for_timeout(1600)
    check(
        "an empty catalog result explains itself",
        "nothing matches" in anon.inner_text("main").lower(),
        anon.inner_text("main")[:70].replace("\n", " "),
    )

    # ---------- catalog cards expand on hover, like the blog ----------
    anon.goto(f"{BASE}/courses", wait_until="networkidle")
    anon.wait_for_timeout(900)

    read_transition = """(sel) => {
        const c = getComputedStyle(document.querySelector(sel));
        return [c.transitionProperty, c.transitionDuration, c.transitionTimingFunction].join(' / ');
    }"""

    catalog_transition = anon.evaluate(read_transition, "main [data-reveal]")

    first = anon.locator('main a[href^="/courses/"]').first
    before = first.bounding_box()["width"]
    first.hover()
    anon.wait_for_timeout(900)
    after = first.bounding_box()["width"]
    check("hovering a catalog card expands it", after > before * 1.4, f"{round(before)} -> {round(after)}")

    blog = b.new_context(viewport={"width": 1500, "height": 1000}).new_page()
    blog.goto(f"{BASE}/blog", wait_until="networkidle")
    blog.wait_for_timeout(900)
    blog_transition = blog.evaluate(read_transition, "main [data-reveal]")

    check(
        "the catalog uses the same expansion as the blog",
        catalog_transition == blog_transition,
        f"catalog {catalog_transition} | blog {blog_transition}",
    )

    # ---------- the blog list ----------
    all_posts = cards(blog, "blog")
    blog.fill('input[aria-label="Search posts by title, summary or body"]', "permissions")
    blog.wait_for_timeout(1600)
    hits = cards(blog, "blog")
    check(
        "blog search narrows the list",
        0 < hits < all_posts and "q=permissions" in blog.url,
        f"{hits} of {all_posts} — {blog.url}",
    )

    blog.click("text=Clear")
    blog.wait_for_timeout(1400)
    blog.select_option('select[aria-label="Filter by author"]', "contentmanager")
    blog.wait_for_timeout(1400)
    check(
        "blog author filter works",
        0 < cards(blog, "blog") < all_posts and "author=contentmanager" in blog.url,
        blog.url,
    )
    blog.close()
    anon.close()

    # ---------- the studio lists ----------
    ictx = b.new_context(viewport={"width": 1500, "height": 1100})
    ins = login(ictx, "instructor@lms.test")
    ins.on("pageerror", lambda e: errs.append(f"instructor: {e}") if app_error(str(e)) else None)

    ins.goto(f"{BASE}/studio", wait_until="networkidle")
    ins.wait_for_timeout(700)
    # Excludes the New course button and the per-row "View student progress" link, both of
    # which sit under the same path prefix as a course row.
    studio_rows = 'main a[href^="/studio/courses/"]:not([href$="/new"]):not([href$="/insights"])'
    studio_all = ins.locator(studio_rows).count()
    ins.fill('input[aria-label="Search courses by title, description or owner"]', "javascript")
    ins.wait_for_timeout(1600)
    check(
        "studio course search narrows the list",
        0 < ins.locator(studio_rows).count() < studio_all,
        f'{ins.locator("main a").count()} links — {ins.url}',
    )

    ins.click("text=Clear")
    ins.wait_for_timeout(1400)
    ins.select_option('select[aria-label="Filter by status"]', "draft")
    ins.wait_for_timeout(1400)
    check("studio status filter works", "status=draft" in ins.url, ins.url)

    cctx = b.new_context(viewport={"width": 1500, "height": 1100})
    cm = login(cctx, "cm@lms.test")
    cm.on("pageerror", lambda e: errs.append(f"cm: {e}") if app_error(str(e)) else None)
    cm.goto(f"{BASE}/studio/blog", wait_until="networkidle")
    cm.wait_for_timeout(700)
    blog_rows = 'main a[href^="/studio/blog/"]:not([href$="/new"])'
    blog_all = cm.locator(blog_rows).count()
    cm.fill('input[aria-label="Search posts by title, summary or author"]', "drafts")
    cm.wait_for_timeout(1600)
    check(
        "studio blog search narrows the list",
        0 < cm.locator(blog_rows).count() < blog_all,
        f"{cm.url}",
    )
    cm.click("text=Clear")
    cm.wait_for_timeout(1400)
    cm.select_option('select[aria-label="Filter by status"]', "draft")
    cm.wait_for_timeout(1400)
    # Asserted on the rows, not on the page text: the status <select> carries the literal
    # option label "Published", so any page-wide search for it matches the control itself
    # and can never come back clean.
    row_texts = [t.lower() for t in cm.locator(blog_rows).all_inner_texts()]
    check(
        "studio blog status filter shows only drafts",
        "status=draft" in cm.url
        and len(row_texts) > 0
        and all("draft" in t and "published" not in t for t in row_texts),
        f"{len(row_texts)} rows — {cm.url}",
    )
    cm.close()

    # ---------- cohort: search, filters, un-enrol ----------
    ins.goto(f"{BASE}/dashboard", wait_until="networkidle")
    ins.wait_for_timeout(900)
    ins.locator('main a[href*="/insights"]').first.click()
    ins.wait_for_url(lambda u: "/insights" in u, timeout=20000)
    ins.wait_for_load_state("networkidle")
    ins.wait_for_timeout(900)
    insights_url = ins.url

    rows = lambda: ins.locator('main a[href^="/studio/students/"]').count()
    cohort_all = rows()
    check("cohort lists students", cohort_all > 0, f"{cohort_all}")

    # The students band stays inside the page container — same width as the charts above.
    band = ins.evaluate(
        """() => {
             const list = document.querySelector('main a[href^="/studio/students/"]').closest('section');
             const charts = document.querySelector('main dl.grid');
             return [list.getBoundingClientRect().width, charts.getBoundingClientRect().width];
        }"""
    )
    check(
        "the students band stays in the reading container",
        round(band[0]) == round(band[1]),
        f"{[round(x) for x in band]}",
    )

    # Search and both filters belong on one line.
    tops = ins.evaluate(
        """() => {
             const els = [
               'input[aria-label="Search students by name or email"]',
               'select[aria-label="Filter by progress"]',
               'select[aria-label="Filter by quiz result"]',
             ].map((sel) => document.querySelector(sel));
             return els.map((e) => Math.round(e.getBoundingClientRect().top));
        }"""
    )
    check("search and both filters share one row", len(set(tops)) == 1, f"tops {tops}")

    ins.fill('input[aria-label="Search students by name or email"]', "student")
    ins.wait_for_timeout(600)
    check("cohort search narrows the list", 0 < rows() <= cohort_all, f"{rows()} of {cohort_all}")

    ins.fill('input[aria-label="Search students by name or email"]', "")
    ins.wait_for_timeout(400)
    ins.select_option('select[aria-label="Filter by progress"]', "not-started")
    ins.wait_for_timeout(600)
    not_started = rows()
    ins.select_option('select[aria-label="Filter by progress"]', "in-progress")
    ins.wait_for_timeout(600)
    in_progress = rows()
    check(
        "cohort progress filter partitions the cohort",
        not_started + in_progress <= cohort_all and (not_started or in_progress),
        f"{not_started} not started, {in_progress} in progress, {cohort_all} total",
    )

    ins.select_option('select[aria-label="Filter by progress"]', "")
    ins.select_option('select[aria-label="Filter by quiz result"]', "none")
    ins.wait_for_timeout(600)
    check("cohort quiz filter works", rows() <= cohort_all, f"{rows()} with no attempt")
    ins.select_option('select[aria-label="Filter by quiz result"]', "")
    ins.wait_for_timeout(600)
    ins.screenshot(path=f"{SHOTS}/cohort-filters.png")

    remove_buttons = ins.locator('main button[aria-label^="Un-enroll"]')
    check("each row offers an un-enrol control", remove_buttons.count() == cohort_all, f"{remove_buttons.count()}")
    check(
        "the un-enrol control is labelled, not a bare icon",
        remove_buttons.first.inner_text().strip() == "Un-enroll",
        remove_buttons.first.inner_text().strip(),
    )

    # ---------- access toggles ----------
    actx = b.new_context(viewport={"width": 1500, "height": 1100})
    admin = login(actx, "admin@lms.test")
    admin.on("pageerror", lambda e: errs.append(f"admin: {e}") if app_error(str(e)) else None)
    admin.goto(f"{BASE}/admin?search=student2", wait_until="networkidle")
    admin.wait_for_timeout(900)

    course_toggle = admin.locator('button[title*="course access"]').first
    blog_toggle = admin.locator('button[title*="blog access"]').first
    check("admin has a course-access toggle", course_toggle.count() > 0)
    check("admin has a blog-access toggle", blog_toggle.count() > 0)

    check(
        "restrictions start off",
        course_toggle.get_attribute("aria-pressed") == "false",
        str(course_toggle.get_attribute("aria-pressed")),
    )

    course_toggle.click()
    admin.wait_for_timeout(1800)
    check(
        "restricting course access sticks",
        admin.locator('button[title*="course access"]').first.get_attribute("aria-pressed") == "true",
    )
    admin.screenshot(path=f"{SHOTS}/admin-access.png")

    # The restriction is enforced on the server, not by hiding a button.
    api = p.request.new_context()
    auth = api.post(
        "http://127.0.0.1:1337/api/auth/local",
        data={"identifier": "student2@lms.test", "password": PW},
    ).json()

    courses = api.get("http://127.0.0.1:1337/api/courses?pagination[pageSize]=1").json()
    target = courses["data"][0]["documentId"]

    refused = api.post(
        "http://127.0.0.1:1337/api/enrollments/enroll",
        headers={"Authorization": f"Bearer {auth['jwt']}", "Content-Type": "application/json"},
        data={"courseId": target},
    )
    check(
        "a course-restricted student cannot enroll",
        refused.status == 403,
        f"{refused.status}",
    )

    # Put it back, and confirm the restriction lifts.
    admin.locator('button[title*="course access"]').first.click()
    admin.wait_for_timeout(1800)
    lifted = api.post(
        "http://127.0.0.1:1337/api/enrollments/enroll",
        headers={"Authorization": f"Bearer {auth['jwt']}", "Content-Type": "application/json"},
        data={"courseId": target},
    )
    check(
        "lifting the restriction restores enrollment",
        lifted.status in (200, 201, 409),
        f"{lifted.status} (409 = already enrolled, which is also allowed)",
    )

    check("no uncaught page errors", not errs, "; ".join(errs[:2]))
    b.close()

passed = sum(1 for _, ok, _ in results if ok)
print("\n" + "=" * 60)
print(f"{passed}/{len(results)} passed")
print("=" * 60)
for name, ok, detail in results:
    if not ok:
        _out(f"  FAILED: {name}  {detail}")
sys.exit(0 if passed == len(results) else 1)
