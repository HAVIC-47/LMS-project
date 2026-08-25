"""End-to-end check of the Part 2 frontend against the live Strapi backend."""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PASSWORD = "Passw0rd!23"

results = []
console_errors = []


def check(name, condition, detail=""):
    results.append((name, bool(condition), detail))
    print(("PASS  " if condition else "FAIL  ") + name + (f"  -- {detail}" if detail else ""))


def login(page, email):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[type="submit"]')
    # router.replace() is a client-side navigation, so networkidle resolves while still on
    # /login. Wait for the URL to actually change instead.
    try:
        page.wait_for_url(lambda u: "/login" not in u, timeout=15000)
    except Exception:
        pass
    page.wait_for_load_state("networkidle")
    # The dashboard streams: loading.tsx paints skeletons first and the real content
    # arrives after. Wait for the heading, which only exists in the resolved page.
    page.wait_for_selector("main h1", timeout=20000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

    # ---------- public pages ----------
    page.goto(BASE, wait_until="networkidle")
    check("landing renders hero", "Learn the parts" in page.inner_text("main") and "that stick" in page.inner_text("main"))
    check("landing shows seeded course", "Modern JavaScript" in page.content())
    check("brand is Kiln", "Kiln" in page.title(), page.title())
    page.screenshot(path=f"{SHOTS}/01-landing.png", full_page=True)

    page.goto(f"{BASE}/courses", wait_until="networkidle")
    cards = page.locator('a[href^="/courses/"]').count()
    check("catalog lists courses", cards >= 3, f"{cards} course links")
    check("unpublished course hidden", "Advanced TypeScript" not in page.content())
    page.screenshot(path=f"{SHOTS}/02-courses.png", full_page=True)

    page.goto(f"{BASE}/courses?level=advanced", wait_until="networkidle")
    check("level filter works", "No advanced courses yet" in page.content())

    page.goto(f"{BASE}/courses/modern-javascript-foundations", wait_until="networkidle")
    body = page.content()
    check("detail shows syllabus", "Values, bindings and scope" in body)
    check("lesson body NOT leaked", "A binding is a name pointing at a value" not in body)
    check("logged-out sees signup CTA", "Get started" in body)
    page.screenshot(path=f"{SHOTS}/03-course-detail.png", full_page=True)

    page.goto(f"{BASE}/blog", wait_until="networkidle")
    body = page.content()
    check("blog shows published post", "first engineering hire" in body)
    check("blog hides draft", "roadmap" not in body.lower())
    page.screenshot(path=f"{SHOTS}/04-blog.png", full_page=True)

    # ---------- route guard ----------
    page.goto(f"{BASE}/dashboard", wait_until="networkidle")
    check("anon redirected off dashboard", "/login" in page.url, page.url)
    check("redirect preserves target", "next=%2Fdashboard" in page.url or "next=/dashboard" in page.url)

    # ---------- student ----------
    login(page, "student@lms.test")
    check("student lands on dashboard", "/dashboard" in page.url, page.url)
    body = page.content()
    check("dashboard greets student", "student" in body.lower())
    check("shows enrolled course", "Modern JavaScript" in body)
    check("shows progress percent", "40%" in body or "2 of 5" in body)
    page.screenshot(path=f"{SHOTS}/05-student-dashboard.png", full_page=True)

    # enrolled course -> enrolled notice, not enroll button
    page.goto(f"{BASE}/courses/modern-javascript-foundations", wait_until="networkidle")
    check("enrolled state shown", "You are enrolled" in page.content())

    # not-yet-enrolled course -> working enroll
    page.goto(f"{BASE}/courses/data-structures-in-practice", wait_until="networkidle")
    # This test is not idempotent against a persistent database: a previous run may have
    # already enrolled this student. Both states are valid, so assert on whichever applies.
    has_enroll = page.locator('button:has-text("Enroll")').count() > 0
    already = "You are enrolled" in page.content()
    check("enroll affordance or enrolled state", has_enroll or already,
          "button" if has_enroll else "already enrolled")
    if has_enroll:
        page.click('button:has-text("Enroll")')
        page.wait_for_timeout(2500)
        check("enroll succeeded", "You are enrolled" in page.content())

    # token must not be reachable from JS
    cookie_visible = page.evaluate("() => document.cookie.includes('lms_token')")
    check("JWT not readable by script", not cookie_visible)

    # ---------- instructor ----------
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx2.new_page()
    login(page2, "instructor@lms.test")
    body = page2.content()
    check("instructor sees own courses", "Courses you manage" in body)
    check("instructor role badge", "Instructor" in body)
    page2.screenshot(path=f"{SHOTS}/06-instructor-dashboard.png", full_page=True)

    page2.goto(f"{BASE}/courses/modern-javascript-foundations", wait_until="networkidle")
    check("instructor cannot enroll", "Enrollment is for student accounts" in page2.content())
    ctx2.close()

    # ---------- admin ----------
    ctx3 = browser.new_context(viewport={"width": 1440, "height": 900})
    page3 = ctx3.new_page()
    login(page3, "admin@lms.test")
    body = page3.content()
    check("admin sees platform stats", "Platform" in body)
    check("admin sees role counts", "Content Manager" in body)
    page3.screenshot(path=f"{SHOTS}/07-admin-dashboard.png", full_page=True)
    ctx3.close()

    # ---------- dark mode + mobile ----------
    page.goto(BASE, wait_until="networkidle")
    page.evaluate("() => { localStorage.setItem('lms-theme','dark'); }")
    page.reload(wait_until="networkidle")
    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("dark theme applies", theme == "dark", f"data-theme={theme}")
    bg = page.evaluate("() => getComputedStyle(document.body).backgroundColor")
    check("dark background painted", bg in ("rgb(9, 9, 11)",), bg)
    page.screenshot(path=f"{SHOTS}/08-landing-dark.png", full_page=True)

    mob = ctx.new_page()
    mob.goto(BASE, wait_until="networkidle")
    mob.set_viewport_size({"width": 375, "height": 812})
    mob.wait_for_timeout(400)
    overflow = mob.evaluate(
        "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    check("no horizontal scroll at 375px", overflow <= 0, f"overflow {overflow}px")
    mob.click('button[aria-label="Open menu"]')
    mob.wait_for_timeout(600)
    check("mobile menu opens", mob.locator("#mobile-menu").count() > 0)
    mob.screenshot(path=f"{SHOTS}/09-mobile-menu.png")
    mob.close()

    # ---------- logout ----------
    page.goto(f"{BASE}/dashboard", wait_until="networkidle")
    if page.locator('button[aria-label="Sign out"]').count() > 0:
        page.click('button[aria-label="Sign out"]')
        page.wait_for_timeout(2500)
    page.goto(f"{BASE}/dashboard", wait_until="networkidle")
    check("logout clears session", "/login" in page.url, page.url)

    browser.close()

real_errors = [e for e in console_errors if "favicon" not in e.lower() and "404" not in e]
if real_errors:
    print("\nConsole errors:")
    for e in real_errors[:8]:
        print("  " + e[:200])

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n{'=' * 60}\n{passed}/{len(results)} passed\n{'=' * 60}")
for name, ok, detail in results:
    if not ok:
        print(f"  FAILED: {name}  {detail}")
sys.exit(0 if passed == len(results) else 1)
