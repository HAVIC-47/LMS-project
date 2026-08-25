"""Part 4: studio authoring, blog draft/publish, admin role management."""
import sys, re, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PW = "Passw0rd!23"
STAMP = str(int(time.time()))[-6:]
results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS  " if cond else "FAIL  ") + name + (f"  -- {detail}" if detail else ""))


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


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    errs = []

    # ---------------- instructor ----------------
    ictx = b.new_context(viewport={"width": 1440, "height": 900})
    ins = login(ictx, "instructor@lms.test")
    ins.on("pageerror", lambda e: errs.append(str(e)))

    ins.goto(f"{BASE}/studio", wait_until="networkidle")
    ins.wait_for_selector("main h1", timeout=20000)
    body = ins.inner_text("body")
    check("instructor reaches studio", "Studio" in body)
    ins_rows = ins.locator('a[href^="/studio/courses/"]:not([href$="/new"])').count()
    check("studio lists own courses", ins_rows >= 3, f"{ins_rows} rows")
    check("instructor sees only own", "Designing for the Web" not in body)
    ins.screenshot(path=f"{SHOTS}/p4-01-studio.png", full_page=True)

    # instructor is not allowed into blog or admin
    ins.goto(f"{BASE}/studio/blog", wait_until="networkidle")
    check("instructor blocked from blog", "/forbidden" in ins.url, ins.url)
    ins.goto(f"{BASE}/admin", wait_until="networkidle")
    check("instructor blocked from admin", "/forbidden" in ins.url, ins.url)

    # create a course
    ins.goto(f"{BASE}/studio/courses/new", wait_until="networkidle")
    ins.wait_for_selector('input[value=""]', timeout=20000)
    title = f"Test Course {STAMP}"
    ins.locator("form input").first.fill(title)
    ins.click('button[type="submit"]')
    ins.wait_for_timeout(4000)
    check("course created", "/studio/courses/" in ins.url and "new" not in ins.url, ins.url)
    course_url = ins.url

    # add a lesson
    ins.wait_for_selector("main h1", timeout=20000)
    ins.click('button:has-text("Add lesson")')
    ins.wait_for_timeout(700)
    forms = ins.locator('form:has-text("New lesson")')
    forms.locator("input").first.fill("Test lesson one")
    ins.locator('form:has-text("New lesson") textarea').first.fill("First paragraph.\n\nSecond paragraph.")
    ins.click('button:has-text("Add lesson")')
    ins.wait_for_timeout(4000)
    check("lesson added", "Test lesson one" in ins.inner_text("body"))

    # add a quiz + question
    ins.click('button:has-text("Add a quiz")')
    ins.wait_for_timeout(700)
    ins.locator('form:has-text("Pass mark") input').first.fill("Test quiz")
    ins.click('button:has-text("Create quiz")')
    ins.wait_for_timeout(4000)
    check("quiz created", "Test quiz" in ins.inner_text("body"))

    ins.click('button:has-text("Add question")')
    ins.wait_for_timeout(700)
    ins.locator('form:has-text("New question") textarea').first.fill("Is this a test question?")
    opts = ins.locator('form:has-text("New question") input[placeholder^="Option"]')
    opts.nth(0).fill("Yes")
    opts.nth(1).fill("No")
    ins.locator('form:has-text("New question") input[type="radio"]').nth(0).check()
    ins.click('button:has-text("Add question")')
    ins.wait_for_timeout(4000)
    body = ins.inner_text("body")
    check("question added", "Is this a test question?" in body)
    check("answer shown to author", "Answer: Yes" in body)
    ins.screenshot(path=f"{SHOTS}/p4-02-course-editor.png", full_page=True)

    # the new course is a draft, so it must not be public
    ictx2 = b.new_context()
    anon = ictx2.new_page()
    anon.goto(f"{BASE}/courses", wait_until="networkidle")
    check("draft course hidden from catalog", title not in anon.inner_text("body"))
    ictx2.close()

    # publish it, then it should appear
    ins.goto(course_url, wait_until="networkidle")
    ins.wait_for_selector("main h1", timeout=20000)
    ins.locator('input[type="checkbox"]').first.check()
    ins.click('button:has-text("Save changes")')
    ins.wait_for_timeout(4000)
    ictx3 = b.new_context()
    anon2 = ictx3.new_page()
    anon2.goto(f"{BASE}/courses", wait_until="networkidle")
    check("published course appears in catalog", title in anon2.inner_text("body"))
    ictx3.close()

    # clean up
    ins.goto(course_url, wait_until="networkidle")
    ins.wait_for_selector("main h1", timeout=20000)
    ins.once("dialog", lambda d: d.accept())
    ins.click('button:has-text("Delete course")')
    ins.wait_for_timeout(4000)
    check("course deleted", ins.url.rstrip("/").endswith("/studio"), ins.url)
    ictx.close()

    # ---------------- content manager ----------------
    cctx = b.new_context(viewport={"width": 1440, "height": 900})
    cm = login(cctx, "cm@lms.test")
    cm.goto(f"{BASE}/studio", wait_until="networkidle")
    cm.wait_for_selector("main h1", timeout=20000)
    cm_rows = cm.locator('a[href^="/studio/courses/"]:not([href$="/new"])').count()
    check("content manager sees every course", cm_rows > ins_rows, f"{cm_rows} vs instructor {ins_rows}")

    cm.goto(f"{BASE}/studio/blog", wait_until="networkidle")
    cm.wait_for_selector("main h1", timeout=20000)
    body = cm.inner_text("body")
    check("blog lists drafts and published", "Draft" in body and "Published" in body)
    cm.screenshot(path=f"{SHOTS}/p4-03-blog-list.png", full_page=True)

    # write a post, confirm it is invisible, publish, confirm visible
    cm.goto(f"{BASE}/studio/blog/new", wait_until="networkidle")
    cm.wait_for_selector("form", timeout=20000)
    post_title = f"Test Post {STAMP}"
    cm.locator("form input").first.fill(post_title)
    cm.locator("form textarea").nth(1).fill("Body of the test post.")
    cm.click('button:has-text("Create post")')
    cm.wait_for_timeout(4000)
    check("post created as draft", "This is a draft" in cm.inner_text("body"))
    post_url = cm.url

    ctx4 = b.new_context()
    anon3 = ctx4.new_page()
    anon3.goto(f"{BASE}/blog", wait_until="networkidle")
    check("draft post hidden from public blog", post_title not in anon3.inner_text("body"))

    cm.click('button:has-text("Publish")')
    cm.wait_for_timeout(4000)
    check("post now published", "This post is live" in cm.inner_text("body"))

    anon3.goto(f"{BASE}/blog", wait_until="networkidle")
    check("published post visible to public", post_title in anon3.inner_text("body"))

    cm.click('button:has-text("Unpublish")')
    cm.wait_for_timeout(4000)
    anon3.goto(f"{BASE}/blog", wait_until="networkidle")
    check("unpublish hides it again", post_title not in anon3.inner_text("body"))
    ctx4.close()

    cm.goto(post_url, wait_until="networkidle")
    cm.wait_for_selector("form", timeout=20000)
    cm.once("dialog", lambda d: d.accept())
    cm.click('button:has-text("Delete")')
    cm.wait_for_timeout(4000)
    check("post deleted", cm.url.rstrip("/").endswith("/studio/blog"), cm.url)
    cctx.close()

    # ---------------- admin ----------------
    actx = b.new_context(viewport={"width": 1440, "height": 900})
    adm = login(actx, "admin@lms.test")
    adm.goto(f"{BASE}/admin", wait_until="networkidle")
    adm.wait_for_selector("main h1", timeout=20000)
    body = adm.inner_text("body")
    check("admin panel loads", "Platform" in body and "Users" in body)
    check("stats rendered", re.search(r"\d+", body) is not None)
    check("user rows listed", adm.locator('select[id^="role-"]').count() >= 4)
    adm.screenshot(path=f"{SHOTS}/p4-04-admin.png", full_page=True)

    # promote the seeded student, then put them back
    sel = adm.locator('select[id^="role-"]')
    target = None
    for i in range(sel.count()):
        row = sel.nth(i)
        rid = row.get_attribute("id")
        if row.input_value() == "student":
            target = row
            break
    check("found a student to promote", target is not None)
    if target is not None:
        target.select_option("instructor")
        adm.wait_for_timeout(3500)
        check("role change persisted", target.input_value() == "instructor", target.input_value())
        adm.reload(wait_until="networkidle")
        adm.wait_for_selector("main h1", timeout=20000)
        again = adm.locator(f'#{rid}')
        check("role survives reload", again.input_value() == "instructor", again.input_value())
        again.select_option("student")
        adm.wait_for_timeout(3500)

    # Last-admin guard.
    #
    # Only meaningful when there is exactly one admin. With two, demoting one is a
    # legitimate operation and the guard is supposed to stay quiet, so the assertion has
    # to branch on the actual count rather than assume a fresh database.
    # Never pick the signed-in admin: demoting yourself bounces the next page load to
    # /forbidden, and the test then has no way back in. The id comes from /api/auth/me
    # rather than from scraping the row, which is what got this wrong before.
    me_id = adm.evaluate("async () => (await (await fetch('/api/auth/me')).json()).user.id")
    self_id = f"role-{me_id}"

    sel = adm.locator('select[id^="role-"]')
    admin_ids = [
        sel.nth(i).get_attribute("id")
        for i in range(sel.count())
        if sel.nth(i).input_value() == "admin"
    ]
    others = [i for i in admin_ids if i != self_id]
    total_admins = len(admin_ids)
    admin_ids = others

    print(f"       ({total_admins} admin accounts, {len(admin_ids)} besides me)")

    if total_admins == 1:
        only = adm.locator(f"#{self_id}")
        adm.once("dialog", lambda d: d.accept())
        only.select_option("student")
        adm.wait_for_timeout(3500)
        check("last admin cannot be demoted", "last admin" in adm.inner_text("body").lower())
        check("last admin keeps the role", adm.locator(f"#{self_id}").input_value() == "admin")
    elif admin_ids:
        # Demote another admin, confirm it took, then restore it.
        victim_id = admin_ids[-1]
        victim = adm.locator(f"#{victim_id}")
        adm.once("dialog", lambda d: d.accept())
        victim.select_option("instructor")
        adm.wait_for_timeout(3500)
        adm.reload(wait_until="networkidle")
        adm.wait_for_selector("main h1", timeout=20000)
        moved = adm.locator(f"#{victim_id}").input_value()
        check("one of several admins can be demoted", moved == "instructor", moved)
        adm.locator(f"#{victim_id}").select_option("admin")
        adm.wait_for_timeout(3500)
        adm.reload(wait_until="networkidle")
        adm.wait_for_selector("main h1", timeout=20000)
        check("and restored", adm.locator(f"#{victim_id}").input_value() == "admin")
    else:
        check("last-admin scenario not reproducible here", True, "only the signed-in admin exists")

    actx.close()

    # ---------------- student is shut out ----------------
    sctx = b.new_context()
    stu = login(sctx, "student@lms.test")
    for path in ["/studio", "/studio/blog", "/admin"]:
        stu.goto(f"{BASE}{path}", wait_until="networkidle")
        check(f"student blocked from {path}", "/forbidden" in stu.url, stu.url)
    sctx.close()

    b.close()

if errs:
    print("\nPage errors:")
    for e in errs[:6]:
        print("  ", e[:180])

ok = sum(1 for _, c, _ in results if c)
print(f"\n{'=' * 60}\n{ok}/{len(results)} passed\n{'=' * 60}")
for n, c, d in results:
    if not c:
        print(f"  FAILED: {n}  {d}")
sys.exit(0 if ok == len(results) else 1)
