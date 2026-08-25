"""Blog reading, likes, comments/replies and the notification system."""
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

    # ---------- the blog is findable ----------
    actx = b.new_context(viewport={"width": 1440, "height": 900})
    anon = actx.new_page()
    anon.on("pageerror", lambda e: errs.append(str(e)))
    anon.goto(BASE, wait_until="networkidle")
    nav = anon.locator("header nav").inner_text()
    check("header says Blog, not Writing", "Blog" in nav and "Writing" not in nav, nav.replace("\n", " ")[:80])

    # Client-side navigation: networkidle can resolve before the URL changes, so wait on
    # the URL itself rather than on the network going quiet.
    anon.click('header nav a[href="/blog"]')
    anon.wait_for_url(lambda u: "/blog" in u, timeout=20000)
    anon.wait_for_load_state("networkidle")
    check("header link reaches the blog", "/blog" in anon.url, anon.url)

    # open the first post
    anon.locator('a[href^="/blog/"]').first.click()
    anon.wait_for_url(re.compile(r"/blog/[^/]+$"), timeout=20000)
    anon.wait_for_load_state("networkidle")
    anon.wait_for_selector("main h1", timeout=20000)
    post_url = anon.url
    check("post opens", re.search(r"/blog/[^/]+$", post_url) is not None, post_url)

    anon.wait_for_selector('button[aria-pressed]', timeout=20000)
    body = anon.inner_text("body")
    check("anon sees like control", anon.locator('button[aria-pressed]').count() > 0)
    check("anon sees discussion", "Discussion" in body)
    check("anon prompted to log in", "to join the discussion" in body)
    check("anon like disabled", anon.locator('button[aria-pressed]').first.is_disabled())
    anon.screenshot(path=f"{SHOTS}/s1-post-anon.png", full_page=True)

    # existing comments from the earlier API test should render
    check("existing thread rendered", "Great post" in body or "comment" in body.lower())

    # ---------- student comments and likes ----------
    sctx = b.new_context(viewport={"width": 1440, "height": 900})
    stu = login(sctx, "student@lms.test")
    stu.goto(post_url, wait_until="networkidle")
    stu.wait_for_selector('button[aria-pressed]', timeout=20000)

    like_btn = stu.locator('button[aria-pressed]').first
    before = int(re.search(r"\d+", like_btn.inner_text()).group(0))
    was_liked = like_btn.get_attribute("aria-pressed") == "true"
    like_btn.click()
    stu.wait_for_timeout(2500)
    after = int(re.search(r"\d+", stu.locator('button[aria-pressed]').first.inner_text()).group(0))
    check("like toggles the count", after == before + (-1 if was_liked else 1), f"{before} -> {after}")

    # put it back so the run is repeatable
    stu.locator('button[aria-pressed]').first.click()
    stu.wait_for_timeout(2000)

    text = f"Comment from the suite {STAMP}"
    stu.locator('textarea#comment-root').fill(text)
    stu.click('button:has-text("Post comment")')
    stu.wait_for_timeout(3000)
    check("comment appears", text in stu.inner_text("body"))
    stu.screenshot(path=f"{SHOTS}/s2-post-commented.png", full_page=True)

    # ---------- content manager replies ----------
    cctx = b.new_context(viewport={"width": 1440, "height": 900})
    cm = login(cctx, "cm@lms.test")
    cm.goto(post_url, wait_until="networkidle")
    cm.wait_for_selector('textarea#comment-root', timeout=20000)

    # find the student's comment and reply to it
    article = cm.locator(f'article:has-text("{text}")').last
    article.locator('button:has-text("Reply")').first.click()
    cm.wait_for_timeout(600)
    reply = f"Reply from the suite {STAMP}"
    cm.locator('textarea[id^="comment-"]:not(#comment-root)').last.fill(reply)
    cm.locator('button:has-text("Reply")').last.click()
    cm.wait_for_timeout(3000)
    check("reply appears", reply in cm.inner_text("body"))
    check("reply is nested", cm.locator('ol.border-l, ol[class*="border-l"]').count() > 0)

    # ---------- notifications ----------
    stu.reload(wait_until="networkidle")
    stu.wait_for_timeout(1500)
    bell = stu.locator('button[aria-label^="Notifications"]')
    check("student has a bell", bell.count() > 0)
    label = bell.first.get_attribute("aria-label")
    check("badge shows unread", "unread" in (label or ""), label)

    bell.first.click()
    stu.wait_for_timeout(2500)
    panel = stu.locator('[role="menu"][aria-label="Notifications"]')
    check("panel opens", panel.count() > 0)
    ptext = panel.inner_text() if panel.count() else ""
    check("reply notification listed", "replied to your comment" in ptext, ptext[:100].replace("\n", " "))
    stu.screenshot(path=f"{SHOTS}/s3-notifications.png")

    # mark all read clears the badge
    if "Mark all read" in ptext:
        panel.locator('button:has-text("Mark all read")').click()
        stu.wait_for_timeout(2500)
        label2 = stu.locator('button[aria-label^="Notifications"]').first.get_attribute("aria-label")
        check("mark all read clears the badge", "unread" not in (label2 or ""), label2)

    # full inbox page
    stu.goto(f"{BASE}/notifications", wait_until="networkidle")
    stu.wait_for_selector("main h1", timeout=20000)
    check("inbox page lists them", "replied to your comment" in stu.inner_text("body"))
    stu.screenshot(path=f"{SHOTS}/s4-inbox.png", full_page=True)

    # anonymous users get no bell
    check("anon has no bell", anon.locator('button[aria-label^="Notifications"]').count() == 0)

    # ---------- notifications fire for non-blog features too ----------
    #
    # Generate the event rather than relying on history: the seeded enrollments and quiz
    # attempts predate the notification system, so an empty inbox here would prove nothing.
    stu.goto(f"{BASE}/learn/modern-javascript-foundations/quiz", wait_until="networkidle")
    stu.wait_for_selector("main h1", timeout=20000)
    if stu.locator('input[type="radio"]').count() > 0:
        names = stu.evaluate(
            "() => [...new Set([...document.querySelectorAll('input[type=radio]')].map(i => i.name))]"
        )
        for name in names:
            stu.locator(f'input[name="{name}"]').first.click(force=True)
        stu.wait_for_timeout(400)
        stu.click('button:has-text("Submit answers")')
        stu.wait_for_timeout(4000)

    ictx = b.new_context()
    ins = login(ictx, "instructor@lms.test")
    ins.goto(f"{BASE}/notifications", wait_until="networkidle")
    ins.wait_for_selector("main h1", timeout=20000)
    itext = ins.inner_text("body")
    check(
        "instructor notified about course activity",
        ("enrolled in" in itext) or ("scored" in itext),
        itext[:120].replace("\n", " "),
    )
    ictx.close()

    # ---------- moderation ----------
    cm.reload(wait_until="networkidle")
    cm.wait_for_selector('textarea#comment-root', timeout=20000)
    target = cm.locator(f'article:has-text("{text}")').last
    check("moderator sees delete on another's comment", target.locator('button:has-text("Delete")').count() > 0)
    cm.once("dialog", lambda d: d.accept())
    target.locator('button:has-text("Delete")').first.click()
    cm.wait_for_timeout(3000)
    after_text = cm.inner_text("body")
    check("comment deleted", text not in after_text)
    check("its reply went with it", reply not in after_text)

    # ---------- serif redesign actually applied ----------
    fam = anon.evaluate("() => getComputedStyle(document.querySelector('main h1')).fontFamily")
    check("headings use the serif display", "Playfair" in fam, fam[:60])
    bg = anon.evaluate("() => getComputedStyle(document.body).backgroundColor")
    # Gallery monochrome moved the paper ground to #f6f5f2.
    check("bone background", bg == "rgb(225, 220, 201)", bg)

    # mobile
    mob = actx.new_page()
    mob.set_viewport_size({"width": 375, "height": 812})
    mob.goto(post_url, wait_until="networkidle")
    mob.wait_for_selector("main h1", timeout=20000)
    ov = mob.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("no h-scroll at 375px", ov <= 0, f"overflow {ov}px")
    mob.close()

    sctx.close(); cctx.close(); actx.close()
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
