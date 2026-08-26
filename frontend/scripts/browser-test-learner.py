"""Per-student progress: the detail page, its expanding cards, and who may open it."""
import sys, re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PW = "Passw0rd!23"
results = []


def _out(line):
    """Windows consoles are cp1252. Page text and framework messages can carry characters
    it cannot encode — a zero-width space in one detail string used to raise
    UnicodeEncodeError inside the reporter, turning a result into a stack trace and hiding
    which check had actually failed. Encode defensively so the report always prints."""
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


# Next's dev-mode instrumentation emits this when a route redirects during navigation:
# the redirect leaves its performance span with a negative duration. It is a dev-tools
# artefact from the framework, not application code, and it does not occur in a build.
# Filtered by exact shape rather than by ignoring page errors wholesale.
def app_error(message: str) -> bool:
    return "cannot have a negative time stamp" not in message

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    errs = []

    # ---------- the rename ----------
    anon = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    anon.goto(BASE, wait_until="networkidle")
    check("site is named CourseCatalyst", "CourseCatalyst" in anon.title(), anon.title())
    check("old name is gone from the header", "Kiln" not in anon.inner_text("header"))
    check("old name is gone from the footer", "Kiln" not in anon.inner_text("footer"))
    anon.close()

    # ---------- instructor: cohort -> student ----------
    ictx = b.new_context(viewport={"width": 1500, "height": 1200})
    ins = login(ictx, "instructor@lms.test")
    ins.on("pageerror", lambda e: errs.append(f"instructor: {e}") if app_error(str(e)) else None)

    ins.goto(f"{BASE}/dashboard", wait_until="networkidle")
    ins.wait_for_timeout(1000)
    ins.locator('main a[href*="/insights"]').first.click()
    ins.wait_for_url(lambda u: "/insights" in u, timeout=20000)
    ins.wait_for_load_state("networkidle")

    student_links = ins.locator('main a[href^="/studio/students/"]')
    check(
        "student names in the cohort link to their record",
        student_links.count() > 0,
        f"{student_links.count()} links",
    )

    student_links.first.click()
    ins.wait_for_url(re.compile(r"/studio/students/\d+$"), timeout=20000)
    ins.wait_for_load_state("networkidle")
    ins.wait_for_timeout(900)
    check("clicking a student opens their page", "/studio/students/" in ins.url, ins.url)

    body = ins.inner_text("main")
    check("page shows the enrolled count", "enrolled" in body.lower())
    check("page shows lessons done", "lessons done" in body.lower())
    check("page shows quiz attempts", "quiz attempts" in body.lower())

    # An instructor sees a filtered record and is told so.
    check(
        "instructor is told the record is scoped to their courses",
        "courses you own" in body.lower(),
        body[:80].replace("\n", " "),
    )

    # ---------- expanding cards: courses ----------
    cards = ins.locator("main ul.grid button")
    course_cards = cards.count()
    check("courses render as cards", course_cards > 0, f"{course_cards} cards")

    cards.first.click()
    ins.wait_for_timeout(700)
    expanded = ins.inner_text("main")

    check("opening a card reveals the lessons", "lessons" in expanded.lower())
    # Every lesson is listed with its order, done or not — that is the "which lesson of
    # the course they completed" requirement.
    check(
        "the lesson list shows completion state",
        "remaining" in expanded.lower() and "enrolled" in expanded.lower(),
    )

    # The opened card should dominate; the others move to a side rail.
    rail = ins.locator("[data-expand-rail]")
    check("the rest move to a side rail", rail.count() == 1, f"{rail.count()} rails")

    panel_w = ins.evaluate(
        "() => document.querySelector('[data-expand-panel]').getBoundingClientRect().width"
    )
    rail_w = ins.evaluate(
        "() => document.querySelector('[data-expand-rail]').getBoundingClientRect().width"
    )
    check(
        "the open card takes most of the width",
        panel_w > rail_w * 2,
        f"panel {round(panel_w)} vs rail {round(rail_w)}",
    )

    # The rail lays out with auto-fill, so narrowing it re-columns the cards rather than
    # squashing them: several across when closed, one across when a card is open.
    cols = ins.evaluate(
        "() => getComputedStyle(document.querySelector('[data-expand-rail] ul'))"
        ".gridTemplateColumns.split(' ').length"
    )
    check("the rail re-columns as it narrows", cols == 1, f"{cols} columns while open")

    ins.screenshot(path=f"{SHOTS}/learner-course-open.png")

    # ---------- the expansion is animated, on the same transition as the blog ----------
    read_panel = (
        "() => { const c = getComputedStyle(document.querySelector('[data-expand-panel]'));"
        " return [c.transitionProperty, c.transitionDuration, c.transitionTimingFunction]"
        ".join(' / '); }"
    )
    learner_transition = ins.evaluate(read_panel)

    blog = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    blog.goto(f"{BASE}/blog", wait_until="networkidle")
    blog.wait_for_timeout(900)
    blog_transition = blog.evaluate(
        "() => { const c = getComputedStyle(document.querySelector('[data-reveal]'));"
        " return [c.transitionProperty, c.transitionDuration, c.transitionTimingFunction]"
        ".join(' / '); }"
    )
    blog.close()

    check(
        "the card expansion uses the same transition as the blog",
        learner_transition == blog_transition,
        f"learner {learner_transition} | blog {blog_transition}",
    )
    check(
        "the transition runs on the site easing curve",
        "cubic-bezier(0.22, 1, 0.36, 1)" in learner_transition,
        learner_transition,
    )

    # Sampled mid-flight. A layout swap would read as 0 and then the final width with
    # nothing in between; an animation has to pass through intermediate values.
    ins.click('button[aria-label="Close and show all"]')
    ins.wait_for_timeout(900)
    ins.locator("[data-expand-rail] ul li button").first.click()

    widths = []
    for _ in range(8):
        widths.append(
            ins.evaluate(
                "() => document.querySelector('[data-expand-panel]').getBoundingClientRect().width"
            )
        )
        ins.wait_for_timeout(55)

    ins.wait_for_timeout(800)
    settled = ins.evaluate(
        "() => document.querySelector('[data-expand-panel]').getBoundingClientRect().width"
    )
    mid = [w for w in widths if 1 < w < settled - 20]
    check(
        "the panel interpolates rather than snapping open",
        len(mid) >= 2,
        f"{[round(w) for w in widths]} -> {round(settled)}",
    )

    # Contents stay put while the panel collapses. An empty box shrinking reads as the
    # panel being destroyed rather than put away.
    ins.click('button[aria-label="Close and show all"]')
    ins.wait_for_timeout(120)
    check(
        "the panel keeps its contents while collapsing",
        ins.evaluate(
            "() => document.querySelector('[data-expand-panel]').innerText.trim().length > 0"
        ),
    )
    ins.wait_for_timeout(900)


    # ---------- expanding cards: quizzes ----------
    ins.click('button:has-text("Track quizzes")')
    ins.wait_for_timeout(700)
    quiz_cards = ins.locator("main ul.grid button").count()
    check("the quiz tracker lists attempts as cards", quiz_cards > 0, f"{quiz_cards} cards")

    ins.locator("main ul.grid button").first.click()
    ins.wait_for_timeout(700)
    quiz_body = ins.inner_text("main")

    # `.microlabel` uppercases through CSS, so this has to be case-insensitive.
    check("opening a quiz card shows the answers", "their answer" in quiz_body.lower())
    check("the pass mark is shown", "pass mark" in quiz_body.lower())
    check("the outcome is shown", "outcome" in quiz_body.lower())
    ins.screenshot(path=f"{SHOTS}/learner-quiz-open.png")

    # Closing returns to the grid.
    ins.click('button[aria-label="Close and show all"]')
    ins.wait_for_timeout(600)
    check(
        "closing returns to the full grid",
        ins.locator("main ul.grid button").count() == quiz_cards
        and ins.locator("main aside").count() == 0,
    )

    # ---------- admin reaches the same page from the user list ----------
    actx = b.new_context(viewport={"width": 1440, "height": 1100})
    admin = login(actx, "admin@lms.test")
    admin.on("pageerror", lambda e: errs.append(f"admin: {e}") if app_error(str(e)) else None)
    admin.goto(f"{BASE}/admin", wait_until="networkidle")
    admin.wait_for_timeout(800)

    admin_links = admin.locator('main a[href^="/studio/students/"]')
    check("admin can open a record from the user list", admin_links.count() > 0)

    admin.goto(f"{BASE}/studio/students/4", wait_until="networkidle")
    admin.wait_for_timeout(900)
    admin_body = admin.inner_text("main")
    check(
        "an admin record is not scoped",
        "courses you own" not in admin_body.lower(),
        admin_body[:70].replace("\n", " "),
    )

    # ---------- a student cannot read another student's record ----------
    sctx = b.new_context()
    student = login(sctx, "student@lms.test")
    # Asserted against Strapi directly with a student's own token. Fetching the HTML route
    # follows the redirect and returns 200 whatever happens, so a status check there can
    # never fail — the refusal lives on the endpoint, so that is what gets called.
    api = p.request.new_context()
    auth = api.post(
        "http://127.0.0.1:1337/api/auth/local",
        data={"identifier": "student@lms.test", "password": PW},
    ).json()
    refused = api.get(
        "http://127.0.0.1:1337/api/learners/4",
        headers={"Authorization": f"Bearer {auth['jwt']}"},
    )
    check(
        "a student cannot read a learner record from the API",
        refused.status in (401, 403),
        str(refused.status),
    )

    student.goto(f"{BASE}/studio/students/4", wait_until="networkidle")
    check(
        "a student navigating there is bounced",
        "/studio/students" not in student.url,
        student.url,
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
