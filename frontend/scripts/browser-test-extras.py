"""Attempt limits, certificates, reviews, the audit trail and CSV export."""
import sys
import re
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
API = "http://127.0.0.1:1337/api"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PW = "Passw0rd!23"
results = []


def app_error(message: str) -> bool:
    """Next dev-mode instrumentation emits a negative-duration performance measure on
    redirects and streaming. Framework internal, never application code, absent in a build."""
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
        page.wait_for_url(lambda u: "/login" not in u, timeout=30000)
    except Exception:
        pass
    page.wait_for_load_state("networkidle")
    return page


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    api = p.request.new_context()
    errs = []

    # Strapi rate-limits `/auth/local`, which is correct behaviour — the suite was the
    # abusive client, logging the same accounts in over and over until it earned a 429.
    # Cached so each account authenticates once, with a backoff for the case where an
    # earlier suite has already spent the allowance.
    _tokens: dict[str, str] = {}

    def token(email):
        if email in _tokens:
            return _tokens[email]

        for attempt in range(6):
            response = api.post(f"{API}/auth/local", data={"identifier": email, "password": PW})
            payload = response.json()

            if "jwt" in payload:
                _tokens[email] = payload["jwt"]
                return payload["jwt"]

            if response.status != 429:
                raise RuntimeError(f"login failed for {email}: {payload}")

            time.sleep(5 * (attempt + 1))

        raise RuntimeError(f"login for {email} still rate-limited after retries")

    admin_jwt = token("admin@lms.test")
    instructor_jwt = token("instructor@lms.test")
    student_jwt = token("student2@lms.test")

    # ---------- 1. attempt limits ----------
    mine = api.get(f"{API}/courses/mine", headers={"Authorization": f"Bearer {instructor_jwt}"}).json()
    course = next(c for c in mine["data"] if c["quizCount"] > 0)
    ins = api.get(
        f"{API}/courses/{course['documentId']}/insights",
        headers={"Authorization": f"Bearer {instructor_jwt}"},
    ).json()["data"]
    quiz = ins["quizzes"][0]

    take = api.get(
        f"{API}/quizzes/{quiz['documentId']}/take",
        headers={"Authorization": f"Bearer {student_jwt}"},
    ).json()["data"]
    status = take.get("attemptStatus")

    check("a quiz reports its attempt allowance", status is not None, str(status))
    check(
        "the allowance is a real cap, not unlimited",
        status and status["maxAttempts"] > 0,
        f"maxAttempts={status and status['maxAttempts']}",
    )

    # Deliberately wrong, so the cap is what stops the loop rather than a pass.
    answers = [
        {"questionId": q["documentId"], "selectedIndex": (q["correctIndex"] + 1) % len(q["options"])}
        for q in quiz["questions"]
    ]

    codes = []
    for _ in range(status["maxAttempts"] + 2):
        r = api.post(
            f"{API}/quizzes/{quiz['documentId']}/submit",
            headers={"Authorization": f"Bearer {student_jwt}", "Content-Type": "application/json"},
            data={"answers": answers},
        )
        codes.append(r.status)
        if r.status != 200:
            break

    check(
        "submitting past the cap is refused by the API",
        codes[-1] == 403,
        f"statuses {codes}",
    )
    check(
        "the cap is not enforced only in the UI",
        403 in codes,
        "a disabled button would have let this through",
    )

    # ---------- 2. certificates ----------
    certs = api.get(f"{API}/certificates/me", headers={"Authorization": f"Bearer {student_jwt}"}).json()["data"]
    check("the student holds a certificate", len(certs) > 0, f"{len(certs)}")

    if certs:
        serial = certs[0]["serial"]
        check("the serial is unguessable, not sequential", re.fullmatch(r"CC(-[A-Z0-9]{4}){3}", serial) is not None, serial)

        anon = b.new_context(viewport={"width": 1440, "height": 1000}).new_page()
        anon.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)
        anon.goto(f"{BASE}/certificates/{serial}", wait_until="networkidle")
        anon.wait_for_timeout(600)
        body = anon.inner_text("main")

        check("the certificate verifies while signed out", serial in body, anon.url)
        check("it names the student and the course", certs[0]["courseTitle"] in body)
        anon.screenshot(path=f"{SHOTS}/certificate.png")

        anon.goto(f"{BASE}/certificates/CC-ZZZZ-ZZZZ-ZZZZ", wait_until="networkidle")
        check("an unknown serial is a 404", "404" in anon.content() or "not found" in anon.inner_text("body").lower())
        anon.close()

    # ---------- 2b. where a student actually finds a certificate ----------
    #
    # The feature existed before this but was only reachable at the bottom of /my-courses,
    # below the whole attempt history. Nothing announced it, so a student could finish a
    # course and be told nothing at all.
    holder = b.new_context(viewport={"width": 1440, "height": 1300})
    hpage = login(holder, "student2@lms.test")
    hpage.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)

    hpage.goto(f"{BASE}/dashboard", wait_until="networkidle")
    hpage.wait_for_timeout(1400)
    check(
        "the student dashboard surfaces certificates",
        hpage.locator('main a[href^="/certificates/"]').count() > 0,
    )

    hpage.goto(f"{BASE}/my-courses", wait_until="networkidle")
    hpage.wait_for_timeout(1400)
    mc = hpage.inner_text("main")
    cert_at, quiz_at = mc.find("Certificates"), mc.find("Quiz results")
    check(
        "certificates sit above the attempt history",
        0 <= cert_at < quiz_at,
        f"Certificates at {cert_at}, Quiz results at {quiz_at}",
    )
    holder.close()

    # Earned live, in the browser, on a fresh account.
    #
    # This is the part that had no coverage: the API had always returned the certificate on
    # the completion that earns it, and the UI silently discarded it, so a student could
    # finish a course and be told nothing. A screenshot is not a regression test.
    #
    # A new account each run because every existing one has already finished something, and
    # the behaviour under test only happens on the transition.
    stamp = str(int(time.time()))[-6:]
    email = f"cert{stamp}@lms.test"

    registered = api.post(
        f"{API}/auth/local/register",
        data={"username": f"cert{stamp}", "email": email, "password": PW},
    ).json()

    check("a fresh account can be created for the run", "jwt" in registered, str(registered)[:80])

    if "jwt" in registered:
        fresh = registered["jwt"]

        # A course with no quiz, so finishing the lessons is the whole condition and the
        # last mark-complete is unambiguously what triggers it.
        no_quiz = api.get(f"{API}/courses?filters[slug][$eq]=data-structures-in-practice").json()
        target = no_quiz["data"][0]

        api.post(
            f"{API}/enrollments/enroll",
            headers={"Authorization": f"Bearer {fresh}", "Content-Type": "application/json"},
            data={"courseId": target["documentId"]},
        )

        syllabus = api.get(
            f"{API}/lessons?filters[course][documentId][$eq]={target['documentId']}"
            "&sort=order:asc&pagination[pageSize]=100",
            headers={"Authorization": f"Bearer {admin_jwt}"},
        ).json()["data"]

        # All but the last through the API, so the browser delivers the one that completes it.
        for lesson in syllabus[:-1]:
            api.post(
                f"{API}/lesson-progresses/complete",
                headers={"Authorization": f"Bearer {fresh}", "Content-Type": "application/json"},
                data={"lessonId": lesson["documentId"]},
            )

        fctx = b.new_context(viewport={"width": 1440, "height": 1100})
        fpage = fctx.new_page()
        fpage.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)
        fpage.goto(f"{BASE}/login", wait_until="networkidle")
        fpage.fill('input[name="email"]', email)
        fpage.fill('input[name="password"]', PW)
        fpage.click('button[type="submit"]')
        fpage.wait_for_url(lambda u: "/login" not in u, timeout=30000)

        fpage.goto(f"{BASE}/learn/data-structures-in-practice", wait_until="networkidle")
        fpage.wait_for_timeout(1500)
        fpage.click('button:has-text("Mark complete")')
        fpage.wait_for_timeout(3500)

        earned = fpage.inner_text("main")

        # Case-insensitive: `.microlabel` uppercases through CSS, so the rendered text is
        # "COURSE COMPLETE" and a literal comparison fails against correct behaviour.
        check(
            "finishing the last lesson announces the certificate",
            "course complete" in earned.lower(),
            earned[:80].replace(chr(10), " "),
        )
        check(
            "the announcement links to the certificate",
            fpage.locator('main a[href^="/certificates/"]').count() > 0,
        )
        check(
            "the announcement shows the serial",
            "CC-" in earned,
            next((l for l in earned.split(chr(10)) if "CC-" in l), "")[:50],
        )
        fpage.screenshot(path=f"{SHOTS}/cert-earned.png")
        fctx.close()

    # The course page says so before you enrol, and the wording follows the actual rule.
    promise = b.new_context(viewport={"width": 1440, "height": 1000}).new_page()
    promise.goto(f"{BASE}/courses/javascript-under-the-hood", wait_until="networkidle")
    promise.wait_for_timeout(1000)
    with_quiz = promise.inner_text("main").lower()

    promise.goto(f"{BASE}/courses/data-structures-in-practice", wait_until="networkidle")
    promise.wait_for_timeout(1000)
    without_quiz = promise.inner_text("main").lower()
    promise.close()

    check("a course page promises a certificate", "certificate" in with_quiz)
    check(
        "the promise names the quiz only when there is one",
        "pass the quiz" in with_quiz and "pass the quiz" not in without_quiz,
        "a course with no quiz needs only the lessons",
    )

    # ---------- 3. reviews ----------
    course_doc = course["documentId"]
    r = api.post(
        f"{API}/reviews",
        headers={"Authorization": f"Bearer {student_jwt}", "Content-Type": "application/json"},
        data={"targetType": "course", "targetDocumentId": course_doc, "rating": 4, "body": "Solid."},
    )
    check("an enrolled student can rate a course", r.status in (200, 201), str(r.status))

    summary = api.get(f"{API}/reviews/course/{course_doc}").json()["data"]
    first_count = summary["count"]
    check("ratings are readable without signing in", first_count > 0, f"count={first_count}")

    api.post(
        f"{API}/reviews",
        headers={"Authorization": f"Bearer {student_jwt}", "Content-Type": "application/json"},
        data={"targetType": "course", "targetDocumentId": course_doc, "rating": 2},
    )
    again = api.get(f"{API}/reviews/course/{course_doc}").json()["data"]
    check(
        "a second rating edits the first rather than stacking",
        again["count"] == first_count and again["average"] != summary["average"],
        f"count {first_count} -> {again['count']}, average {summary['average']} -> {again['average']}",
    )

    other = token("student@lms.test")
    refused = api.post(
        f"{API}/reviews",
        headers={"Authorization": f"Bearer {other}", "Content-Type": "application/json"},
        data={"targetType": "course", "targetDocumentId": course_doc, "rating": 1},
    )
    check(
        "a student not enrolled cannot rate the course",
        refused.status == 403,
        str(refused.status),
    )

    # The panel renders on both detail pages.
    reader = b.new_context(viewport={"width": 1440, "height": 1000}).new_page()
    reader.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)
    reader.goto(f"{BASE}/courses/{course['slug']}", wait_until="networkidle")
    reader.wait_for_timeout(1500)
    check("the course page shows ratings", "ratings" in reader.inner_text("main").lower())

    reader.goto(f"{BASE}/courses", wait_until="networkidle")
    reader.wait_for_timeout(1200)
    catalog = reader.locator('main a[href^="/courses/"]').all_inner_texts()
    check(
        "course cards show a rating where one exists",
        sum(1 for t in catalog if "out of 5" in t) > 0,
        f'{sum(1 for t in catalog if "out of 5" in t)} of {len(catalog)} cards',
    )
    check(
        "an unrated course shows no stars rather than a zero score",
        any("out of 5" not in t for t in catalog),
        "0.0 on a new course would read as a bad score",
    )

    # Posts no longer carry ratings — they have a like and a comment thread, and a third
    # finer-grained signal asked readers to score an article out of five for no clear
    # purpose. The card shows the two counts instead.
    reader.goto(f"{BASE}/blog", wait_until="networkidle")
    reader.wait_for_timeout(1200)

    # Asserted against the API rather than by pattern-matching the card text. The first
    # version used a regex written in a non-raw string, where "" is a backspace character
    # rather than a word boundary — it matched nothing and failed a card that was correct.
    posts_api = api.get(f"{API}/blog-posts?pagination[pageSize]=1").json()["data"][0]
    card_text = reader.locator('main a[href^="/blog/"]').first.inner_text()

    check(
        "blog cards label a like and a comment count",
        "like" in card_text.lower() and "comment" in card_text.lower(),
        card_text.replace(chr(10), " | ")[:70],
    )
    check(
        "the counts come from the API, not a placeholder",
        str(posts_api.get("likeCount")) in card_text
        and str(posts_api.get("commentCount")) in card_text,
        f'likes={posts_api.get("likeCount")} comments={posts_api.get("commentCount")}',
    )

    reader.locator('main a[href^="/blog/"]').first.click()
    reader.wait_for_url(re.compile(r"/blog/[^/]+$"), timeout=20000)
    reader.wait_for_load_state("networkidle")
    reader.wait_for_timeout(1500)
    post_body = reader.inner_text("main").lower()
    check("the blog post no longer offers ratings", "ratings" not in post_body)
    check("the blog post keeps its discussion", "discussion" in post_body)
    reader.screenshot(path=f"{SHOTS}/reviews-post.png")
    reader.close()

    # And the API refuses a post rating outright, rather than the UI merely hiding it.
    post_rating = api.post(
        f"{API}/reviews",
        headers={"Authorization": f"Bearer {student_jwt}", "Content-Type": "application/json"},
        data={"targetType": "post", "targetDocumentId": "anything", "rating": 5},
    )
    check(
        "rating a post is refused by the API",
        post_rating.status == 400,
        str(post_rating.status),
    )

    # ---------- 4. audit trail ----------
    before = api.get(f"{API}/audit-logs", headers={"Authorization": f"Bearer {admin_jwt}"}).json()
    check("the audit trail is readable by an admin", before is not None)

    refused_audit = api.get(f"{API}/audit-logs", headers={"Authorization": f"Bearer {student_jwt}"})
    check("a student cannot read the audit trail", refused_audit.status == 403, str(refused_audit.status))

    # A privileged action must leave a trace.
    users = api.get(f"{API}/platform/users?search=student2", headers={"Authorization": f"Bearer {admin_jwt}"}).json()["data"]
    target = users[0]
    api.put(
        f"{API}/platform/users/{target['id']}/access",
        headers={"Authorization": f"Bearer {admin_jwt}", "Content-Type": "application/json"},
        data={"blogAccessRestricted": True},
    )
    after = api.get(f"{API}/audit-logs", headers={"Authorization": f"Bearer {admin_jwt}"}).json()

    check(
        "a privileged action is recorded",
        after["meta"]["total"] > before["meta"]["total"],
        f"{before['meta']['total']} -> {after['meta']['total']}",
    )
    check(
        "the entry names the actor, the target and what changed",
        after["data"][0]["actorLabel"] == "admin"
        and after["data"][0]["targetLabel"] == target["username"]
        and after["data"][0]["action"] == "access.blog.restricted",
        str(after["data"][0])[:110],
    )

    # There is no way to alter it.
    tamper = api.delete(
        f"{API}/audit-logs/{after['data'][0]['documentId']}",
        headers={"Authorization": f"Bearer {admin_jwt}"},
    )
    check(
        "the trail cannot be deleted through the API",
        tamper.status in (403, 404, 405),
        str(tamper.status),
    )

    # Put the restriction back.
    api.put(
        f"{API}/platform/users/{target['id']}/access",
        headers={"Authorization": f"Bearer {admin_jwt}", "Content-Type": "application/json"},
        data={"blogAccessRestricted": False},
    )

    actx = b.new_context(viewport={"width": 1440, "height": 1200})
    admin = login(actx, "admin@lms.test")
    admin.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)
    admin.goto(f"{BASE}/admin", wait_until="networkidle")
    admin.wait_for_timeout(1200)
    admin_body = admin.inner_text("main").lower()
    check("the admin panel shows the audit trail", "audit trail" in admin_body)
    check("entries are rendered", "restricted" in admin_body or "role changed" in admin_body)
    admin.screenshot(path=f"{SHOTS}/audit-trail.png", full_page=False)

    # ---------- 4b. the two growing lists scroll inside themselves ----------
    # The panel's user list and audit trail both grow without limit. The property under
    # test is not "a button exists" but "the page does not inherit the length of the
    # table" — so the assertion compares the document against the lists it contains.
    def sections():
        return admin.evaluate("""() => [...document.querySelectorAll('main div.overflow-y-auto')]
            .map(e => ({client: Math.round(e.clientHeight), scroll: Math.round(e.scrollHeight)}))""")

    def page_height():
        return admin.evaluate("Math.round(document.documentElement.scrollHeight)")

    # Wait for the sections rather than assuming they are there the moment the network
    # settles: a dev server recompiling this route serves the shell first, and a bare
    # `max()` over the empty result crashed the suite instead of reporting a failure.
    try:
        admin.wait_for_selector("main div.overflow-y-auto", timeout=15000)
    except Exception:
        pass

    expanders = admin.locator("main button[aria-expanded]")
    check("both growing sections carry an expander", expanders.count() == 2, str(expanders.count()))

    collapsed = sections()
    if len(collapsed) != 2:
        check("the admin panel renders both scrolling sections", False, f"{len(collapsed)} found")
        collapsed = [{"client": 0, "scroll": 0}, {"client": 0, "scroll": 0}]
    check(
        "both sections scroll inside themselves",
        len(collapsed) == 2 and all(s["scroll"] > s["client"] + 1 for s in collapsed),
        str(collapsed),
    )
    check(
        "the sections are capped to the same height",
        len(collapsed) == 2 and collapsed[0]["client"] == collapsed[1]["client"],
        str(collapsed),
    )

    # The regression this exists for: `overflow` does not clip an absolutely-positioned
    # descendant whose containing block is outside the scroller, and every row carries an
    # `sr-only` label. With the scroller left `static` the lists looked capped while the
    # document still scrolled their full length — capping nothing.
    height_collapsed = page_height()
    tallest = max(s["scroll"] for s in collapsed)
    check(
        "the page is shorter than the lists it holds",
        height_collapsed < tallest,
        f"page {height_collapsed} vs list {tallest}",
    )

    expanders.first.click()
    admin.wait_for_timeout(700)
    expanded = sections()
    check(
        "expanding raises the cap without removing it",
        expanded[0]["client"] > collapsed[0]["client"]
        and expanded[0]["scroll"] > expanded[0]["client"] + 1,
        str(expanded[0]),
    )
    check(
        "expanding one section leaves the other capped",
        expanded[1]["client"] == collapsed[1]["client"],
        str(expanded[1]),
    )
    check(
        "the page grows only by the raised cap",
        page_height() - height_collapsed == expanded[0]["client"] - collapsed[0]["client"],
        f"page +{page_height() - height_collapsed}, cap +{expanded[0]['client'] - collapsed[0]['client']}",
    )
    check(
        "the expanded page is still shorter than the lists",
        page_height() < tallest,
        f"page {page_height()} vs list {tallest}",
    )

    expanders.first.click()
    admin.wait_for_timeout(700)
    check("collapsing restores the cap", sections()[0]["client"] == collapsed[0]["client"], str(sections()[0]))
    check("collapsing restores the page height", page_height() == height_collapsed, str(page_height()))

    # The filters have to stay outside the scroller, or searching a long list means
    # scrolling up through it to reach the box you searched with.
    check(
        "the user filters sit outside the scrolling area",
        admin.evaluate("""() => {
            const box = document.querySelector('main input[type="search"], main input[name="q"]');
            if (!box) return false;
            for (let n = box.parentElement; n; n = n.parentElement)
                if (n.classList.contains('overflow-y-auto')) return false;
            return true;
        }"""),
    )

    # ---------- 5. CSV export ----------
    users_csv = api.get(f"{API}/platform/users/export", headers={"Authorization": f"Bearer {admin_jwt}"})
    check("the admin user export returns CSV", users_csv.status == 200, users_csv.headers.get("content-type", ""))

    text = users_csv.text()
    header = text.splitlines()[0]
    check("the export has a header row", header.startswith("username,"), header[:60])

    cohort_csv = api.get(
        f"{API}/courses/{course_doc}/students/export",
        headers={"Authorization": f"Bearer {instructor_jwt}"},
    )
    check("the cohort export returns CSV", cohort_csv.status == 200, str(cohort_csv.status))
    check(
        "the cohort export carries the progress columns",
        "completion %" in cohort_csv.text().splitlines()[0],
        cohort_csv.text().splitlines()[0][:70],
    )

    student_csv = api.get(
        f"{API}/platform/users/export", headers={"Authorization": f"Bearer {student_jwt}"}
    )
    check("a student cannot export the user list", student_csv.status == 403, str(student_csv.status))

    # The download buttons exist where they are needed.
    check(
        "the admin panel offers an export button",
        admin.locator('main a[href^="/api/export/users"]').count() > 0,
    )

    ictx = b.new_context(viewport={"width": 1440, "height": 1000})
    ins_page = login(ictx, "instructor@lms.test")
    ins_page.goto(f"{BASE}/studio/courses/{course_doc}/insights", wait_until="networkidle")
    ins_page.wait_for_timeout(1000)
    check(
        "the insights page offers an export button",
        ins_page.locator('main a[href*="/api/export/course/"]').count() > 0,
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
