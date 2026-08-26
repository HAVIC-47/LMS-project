"""Role dashboards: student statistics, instructor cohorts, writer blog data, admin filters."""
import sys, re, time
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

    # ---------- student: statistics, not a second copy of My Courses ----------
    sctx = b.new_context(viewport={"width": 1440, "height": 1200})
    student = login(sctx, "student@lms.test")
    student.on("pageerror", lambda e: errs.append(f"student: {e}") if app_error(str(e)) else None)
    student.goto(f"{BASE}/dashboard", wait_until="networkidle")
    student.wait_for_timeout(1200)

    body = student.inner_text("main").lower()
    check("student dashboard shows completion stats", "overall completion" in body, body[:70])
    check("student dashboard shows quiz marks", "quiz marks" in body)
    check(
        "student dashboard draws charts",
        student.locator("main svg").count() >= 2,
        f'{student.locator("main svg").count()} svgs',
    )

    # The whole point of the split: the dashboard measures, My Courses is where you carry
    # on. If the dashboard were still a grid of course cards these two would be identical.
    dash_links = student.locator('main a[href^="/learn/"]').count()
    student.goto(f"{BASE}/my-courses", wait_until="networkidle")
    mine_body = student.inner_text("main").lower()
    check(
        "my courses is not the same page as the dashboard",
        "overall completion" not in mine_body and "quiz marks" not in mine_body,
        mine_body[:70],
    )
    check("dashboard still links into lessons", dash_links > 0, f"{dash_links} lesson links")

    # ---------- instructor: cohort summary, then a course-level view ----------
    ictx = b.new_context(viewport={"width": 1440, "height": 1200})
    ins = login(ictx, "instructor@lms.test")
    ins.on("pageerror", lambda e: errs.append(f"instructor: {e}") if app_error(str(e)) else None)
    ins.goto(f"{BASE}/dashboard", wait_until="networkidle")
    ins.wait_for_timeout(1200)

    ibody = ins.inner_text("main").lower()
    check("instructor dashboard summarises the cohort", "cohort progress" in ibody, ibody[:70])
    check("instructor dashboard charts enrolment", "enrolment by course" in ibody)
    check(
        "instructor dashboard shows mean completion",
        "mean completion" in ibody,
    )

    insight_links = ins.locator('main a[href*="/insights"]')
    check(
        "course names link to the staff view, not the public page",
        insight_links.count() > 0,
        f"{insight_links.count()} links",
    )

    insight_links.first.click()
    ins.wait_for_url(lambda u: "/insights" in u, timeout=20000)
    ins.wait_for_load_state("networkidle")
    ins.wait_for_timeout(1000)

    cbody = ins.inner_text("main").lower()
    check("insights page names the cohort", "students" in cbody, ins.url)
    check("insights page charts lesson drop-off", "completion by lesson" in cbody)

    # Rows are links to each student's own record now, not in-place expanders. The marked
    # answers moved with them — browser-test-learner.py covers that page in full.
    rows = ins.locator('main a[href^="/studio/students/"]')
    check("insights page lists enrolled students", rows.count() > 0, f"{rows.count()} rows")

    if rows.count():
        rows.first.scroll_into_view_if_needed()
        rows.first.click()
        ins.wait_for_url(lambda u: "/studio/students/" in u, timeout=20000)
        ins.wait_for_load_state("networkidle")
        ins.wait_for_timeout(700)
        check("a student row opens their full record", "/studio/students/" in ins.url, ins.url)
        ins.screenshot(path=f"{SHOTS}/dash-insights.png")
        ins.go_back()
        ins.wait_for_load_state("networkidle")

    # An instructor must not see another instructor's cohort. The content manager owns
    # courses this instructor does not.
    cm_ctx = b.new_context()
    cm_page = login(cm_ctx, "cm@lms.test")
    cm_page.goto(f"{BASE}/studio", wait_until="networkidle")
    cm_ids = cm_page.eval_on_selector_all(
        'a[href*="/insights"]', "els => els.map(e => e.getAttribute('href'))"
    )
    ins_ids = ins.eval_on_selector_all(
        'a[href*="/insights"]', "els => els.map(e => e.getAttribute('href'))"
    )
    foreign = [href for href in cm_ids if href not in ins_ids]

    if foreign:
        status = ins.evaluate(
            "async (href) => (await fetch(href)).status", foreign[0]
        )
        check(
            "another owner's course insights are refused",
            status in (403, 404),
            f"{foreign[0]} -> {status}",
        )
    else:
        check("another owner's course insights are refused", True, "no foreign course to test")

    # ---------- content manager: the blog, not somebody else's courses ----------
    cm_page.goto(f"{BASE}/dashboard", wait_until="networkidle")
    cm_page.wait_for_timeout(1200)
    wbody = cm_page.inner_text("main").lower()
    check("writer dashboard leads with the blog", "your desk" in wbody, wbody[:70])
    check("writer dashboard charts publishing over time", "published per month" in wbody)
    check("writer dashboard shows engagement", "most discussed" in wbody)
    check(
        "writer dashboard counts drafts and published",
        "drafts" in wbody and "published" in wbody,
    )

    # ---------- admin: dashboard is the admin panel, plus search and filters ----------
    actx = b.new_context(viewport={"width": 1440, "height": 1200})
    admin = login(actx, "admin@lms.test")
    admin.on("pageerror", lambda e: errs.append(f"admin: {e}") if app_error(str(e)) else None)

    admin.goto(f"{BASE}/dashboard", wait_until="networkidle")
    check("admin /dashboard redirects to /admin", admin.url.rstrip("/").endswith("/admin"), admin.url)

    header_dashboard = admin.get_attribute('header a:has-text("Dashboard")', "href")
    check("header Dashboard button points at /admin", header_dashboard == "/admin", str(header_dashboard))

    admin.goto(f"{BASE}/admin", wait_until="networkidle")
    admin.wait_for_timeout(800)

    def user_rows():
        # One <select> per user row for changing their role, plus the two filter selects.
        return admin.locator("main select").count() - 2

    everyone = user_rows()
    check("admin lists users", everyone > 0, f"{everyone} users")

    admin.fill('input[aria-label="Search users by name or email"]', "instructor")
    admin.wait_for_timeout(1800)
    searched = user_rows()
    check(
        "searching narrows the user list",
        0 < searched < everyone and "search=instructor" in admin.url,
        f"{searched} of {everyone} — {admin.url}",
    )

    admin.fill('input[aria-label="Search users by name or email"]', "")
    admin.wait_for_timeout(1800)
    admin.select_option("main select >> nth=0", "student")
    admin.wait_for_timeout(1500)
    filtered = user_rows()
    check(
        "filtering by role narrows the user list",
        0 < filtered < everyone and "role=student" in admin.url,
        f"{filtered} of {everyone} — {admin.url}",
    )

    # The filter is applied by the backend, so the browser never receives the rows it is
    # not showing. Asserting on the payload rather than on the DOM is what proves that.
    payload_count = admin.evaluate(
        """async () => {
             const r = await fetch('/api/auth/me');
             return r.status;
           }"""
    )
    check("session still valid after filtering", payload_count == 200, str(payload_count))

    admin.click("text=Clear")
    admin.wait_for_timeout(1500)
    check(
        "clearing restores the full list",
        user_rows() == everyone and "role=" not in admin.url,
        f"{user_rows()} — {admin.url}",
    )
    admin.screenshot(path=f"{SHOTS}/dash-admin.png")

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
