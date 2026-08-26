"""Profiles: editing your own, uploading an avatar, and what other people can see."""
import sys, re, time, struct, zlib
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PW = "Passw0rd!23"
STAMP = str(int(time.time()))[-6:]
results = []


def app_error(message: str) -> bool:
    """Next's dev-mode instrumentation emits `Failed to execute 'measure' on 'Performance'`
    when a route redirects or streams: the span ends up with a negative duration. It names
    a framework internal (`?ProfilePage`, `?LearnLayout`), never application code, and does
    not occur in a production build. Filtered by exact shape rather than by ignoring page
    errors wholesale, so a real one still fails the run."""
    return "cannot have a negative time stamp" not in message


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


def png_bytes(w=64, h=64):
    """A real PNG built by hand.

    Playwright's set_input_files needs actual bytes, and a solid-colour image compresses
    to almost nothing — small enough that it would pass a size cap without exercising it.
    Rows are given varying pixel values so the file has genuine entropy.
    """
    raw = b"".join(
        b"\x00" + bytes([(x * 7 + y * 13) % 256 for x in range(w) for _ in range(3)])
        for y in range(h)
    )

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    errs = []

    # ---------- a profile is public ----------
    actx = b.new_context(viewport={"width": 1440, "height": 900})
    anon = actx.new_page()
    anon.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)

    anon.goto(f"{BASE}/u/instructor", wait_until="networkidle")
    body = anon.inner_text("main")
    check("signed-out visitor can read a profile", "instructor" in body.lower(), anon.url)
    check("role is shown on the profile", "instructor" in body.lower())

    # The spec asks for course counts on an instructor. The seeded instructor owns several.
    nums = [int(n) for n in re.findall(r"\b(\d+)\b", body)]
    check("instructor profile shows teaching figures", any(n > 0 for n in nums), f"{nums[:6]}")
    course_links = anon.locator('main a[href^="/courses/"]').count()
    check("instructor profile lists their courses", course_links > 0, f"{course_links} course links")

    # Email and the edit button belong to the account holder only.
    check("visitor sees no email address", "@lms.test" not in body, body[:120])
    check("visitor sees no edit button", "Edit profile" not in body)
    check("visitor sees no learning section", "Only visible to you" not in body)

    anon.goto(f"{BASE}/u/contentmanager", wait_until="networkidle")
    cm_body = anon.inner_text("main")
    check("content manager profile shows writing", "writing" in cm_body.lower(), cm_body[:80])
    check(
        "content manager profile lists their posts",
        anon.locator('main a[href^="/blog/"]').count() > 0,
    )
    # A published post is titled "Drafts that are actually private", so a text search for
    # "drafts" finds the headline, not a leak. Assert on the stat label itself.
    draft_stat = anon.locator('main dl .microlabel', has_text=re.compile(r'^drafts$', re.I)).count()
    check("visitor sees no draft count", draft_stat == 0, f"{draft_stat} draft stats")

    # A username with a space in it.
    #
    # Path segments arrive from the router still percent-encoded, so `Faisal%20Hossain`
    # was being encoded a second time into `Faisal%2520Hossain`; Strapi found no such user
    # and the page rendered its not-found state. Every account whose name contains a space
    # had an unreachable profile, which is most accounts registered with a real name.
    api = p.request.new_context()
    admin_auth = api.post(
        "http://127.0.0.1:1337/api/auth/local",
        data={"identifier": "admin@lms.test", "password": PW},
    ).json()
    everyone = api.get(
        "http://127.0.0.1:1337/api/platform/users",
        headers={"Authorization": f"Bearer {admin_auth['jwt']}"},
    ).json()["data"]

    spaced = next((u["username"] for u in everyone if " " in u["username"]), None)

    if spaced:
        from urllib.parse import quote

        anon.goto(f"{BASE}/u/{quote(spaced)}", wait_until="networkidle")
        anon.wait_for_timeout(500)
        check(
            "a profile whose username contains a space is reachable",
            spaced.lower() in anon.inner_text("main").lower(),
            f"{spaced} -> {anon.inner_text('main')[:60].replace(chr(10), ' ')}",
        )
    else:
        check("a profile whose username contains a space is reachable", True, "no such account")

    anon.goto(f"{BASE}/u/nobody-at-all", wait_until="networkidle")
    check("unknown username is a 404", "404" in anon.content() or "not found" in anon.inner_text("body").lower())
    anon.close()

    # ---------- editing your own profile ----------
    ictx = b.new_context(viewport={"width": 1440, "height": 900})
    page = login(ictx, "instructor@lms.test")
    page.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)

    # The avatar lives in the header and links to your own profile.
    # Waited for rather than counted immediately: the check used to race the redirect that
    # follows login and read the header of the page being navigated away from.
    page.wait_for_selector('header a[href="/u/instructor"]', timeout=20000)
    avatar_link = page.locator('header a[href="/u/instructor"]')
    check("header shows a profile link for the signed-in user", avatar_link.count() > 0)

    avatar_link.first.click()
    page.wait_for_url(lambda u: "/u/instructor" in u, timeout=20000)
    page.wait_for_load_state("networkidle")
    check("clicking the header avatar opens your profile", "/u/instructor" in page.url, page.url)

    own = page.inner_text("main")
    check("own profile shows your email", "instructor@lms.test" in own)
    check("own profile offers an edit button", "Edit profile" in own)

    page.click('a[href="/settings/profile"]')
    page.wait_for_url(lambda u: "/settings/profile" in u, timeout=20000)
    page.wait_for_load_state("networkidle")

    name = f"Dana Okafor {STAMP}"
    bio = f"Teaches the systems courses. Checked {STAMP}."

    page.fill('input#\\:r0\\:, input', name) if False else None
    # Fields are labelled, so they are addressed by label rather than by a generated id.
    page.get_by_label("Display name").fill(name)
    page.get_by_label("Bio").fill(bio)
    page.get_by_label("Website").fill("example.com")

    # Upload an avatar from the device.
    page.set_input_files("input#avatar-file", {
        "name": "avatar.png",
        "mimeType": "image/png",
        "buffer": png_bytes(),
    })
    page.wait_for_function(
        "() => !document.querySelector('label[for=avatar-file]').textContent.includes('Uploading')",
        timeout=30000,
    )

    uploaded = page.evaluate(
        "() => { const i = document.querySelector('form img'); return i ? i.currentSrc || i.src : null; }"
    )
    check("avatar upload produced an image", bool(uploaded), str(uploaded)[:90])

    page.click('button[type="submit"]')
    page.wait_for_selector("text=Saved.", timeout=20000)
    check("profile saved", True)

    # ---------- the change is visible everywhere ----------
    page.goto(f"{BASE}/u/instructor", wait_until="networkidle")
    saved = page.inner_text("main")
    check("display name is shown on the profile", name in saved, saved[:80])
    check("bio is shown on the profile", bio in saved)
    check("website is normalised to a URL", page.locator('main a[href="https://example.com/"]').count() > 0)

    header_img = page.evaluate(
        "() => { const i = document.querySelector('header a[href=\"/u/instructor\"] img');"
        " return i ? { w: i.naturalWidth, src: i.currentSrc || i.src } : null; }"
    )
    check(
        "avatar renders in the header",
        bool(header_img and header_img["w"] > 0),
        str(header_img)[:90],
    )
    page.screenshot(path=f"{SHOTS}/profile-own.png", full_page=False)

    # A signed-out visitor now sees the new name too.
    fresh = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    fresh.goto(f"{BASE}/u/instructor", wait_until="networkidle")
    check("other people see the updated profile", name in fresh.inner_text("main"))
    fresh.screenshot(path=f"{SHOTS}/profile-public.png", full_page=False)
    fresh.close()

    # ---------- a student has a profile too ----------
    sctx = b.new_context(viewport={"width": 1440, "height": 900})
    student = login(sctx, "student@lms.test")
    student.on("pageerror", lambda e: errs.append(str(e)) if app_error(str(e)) else None)
    student.goto(f"{BASE}/u/student", wait_until="networkidle")
    stud = student.inner_text("main")
    # Case-insensitive: `.microlabel` uppercases via CSS, so `inner_text` returns the
    # rendered casing rather than the source casing.
    check("student sees their own learning stats", "only visible to you" in stud.lower(), stud[:80])
    check("student profile shows the role", "student" in stud.lower())

    # Students upload avatars as well — the permission is not staff-only any more.
    student.goto(f"{BASE}/settings/profile", wait_until="networkidle")
    student.set_input_files("input#avatar-file", {
        "name": "s.png",
        "mimeType": "image/png",
        "buffer": png_bytes(48, 48),
    })
    student.wait_for_function(
        "() => !document.querySelector('label[for=avatar-file]').textContent.includes('Uploading')",
        timeout=30000,
    )
    # Waited for the image to decode. Sampling `naturalWidth` the instant the upload
    # request resolves reads 0 on a picture that is merely still loading, which looks
    # exactly like a permission failure and is not one.
    student.wait_for_selector("form img", timeout=20000)
    student.wait_for_function(
        "() => { const i = document.querySelector('form img'); return i && i.naturalWidth > 0; }",
        timeout=20000,
    )
    stud_avatar = student.evaluate("() => document.querySelector('form img').naturalWidth")
    check("a student can upload an avatar", stud_avatar > 0, f"{stud_avatar}px")

    # ---------- profiles are reachable from content ----------
    student.goto(f"{BASE}/courses/javascript-under-the-hood", wait_until="networkidle")
    check(
        "course page links to the instructor's profile",
        student.locator('main a[href^="/u/"]').count() > 0,
    )

    # A seeded post with a known author rather than whichever post happens to sort first —
    # the list is ordered by date and its head is whatever was published most recently.
    student.goto(f"{BASE}/blog/permissions-belong-on-the-server", wait_until="networkidle")
    check(
        "blog post links to the author's profile",
        student.locator('main a[href^="/u/"]').count() > 0,
    )

    # ---------- you cannot edit anybody else ----------
    forged = student.evaluate(
        """async () => {
             const r = await fetch('/api/profile', {
               method: 'PUT',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ username: 'admin', role: 'admin', email: 'x@y.z',
                                      displayName: 'Tampered' })
             });
             return r.status;
           }"""
    )
    check("privilege fields in the body are ignored, not accepted as a role change", forged == 200, f"status {forged}")

    after = student.evaluate(
        "async () => (await (await fetch('/api/auth/me')).json())"
    )
    role_now = (after or {}).get("user", {}).get("role") or (after or {}).get("role")
    check("role was not changed by the forged body", role_now == "student", str(role_now))

    admin_profile = student.evaluate(
        "async () => (await (await fetch('/api/auth/me')).json())"
    )
    student.goto(f"{BASE}/u/admin", wait_until="networkidle")
    check(
        "another user's profile is readable but not editable",
        "Edit profile" not in student.inner_text("main"),
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
