"""Cover image upload from the device, plus the monochrome/layout redesign."""
import sys, re, time, struct, zlib, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = r"C:\Users\faisa\AppData\Local\Temp\claude\f--all-PROJECTS-CPS-peiject\e1be724a-64d5-4c39-ace3-bd904d5c7021\scratchpad"
PW = "Passw0rd!23"
STAMP = str(int(time.time()))[-6:]
results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS  " if cond else "FAIL  ") + name + (f"  -- {detail}" if detail else ""))


def make_png(path, w=600, h=400, rgb=(40, 40, 46)):
    """A real PNG, written by hand so the test needs no image library."""
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)
    return path


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


img = make_png(os.path.join(SHOTS, "upload-fixture.png"))
big = os.path.join(SHOTS, "upload-too-big.png")
# 6MB of random bytes behind a PNG signature. The route rejects on size before it looks
# at the contents, and a solid-colour PNG compresses far too small to exercise the cap.
PNG_SIGNATURE = bytes([137, 80, 78, 71, 13, 10, 26, 10])
with open(big, "wb") as fh:
    fh.write(PNG_SIGNATURE + os.urandom(6 * 1024 * 1024))
print("oversize fixture: {:.1f} MB".format(os.path.getsize(big) / 1048576))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    errs = []

    # ---------- the redesign ----------
    actx = b.new_context(viewport={"width": 1440, "height": 900})
    anon = actx.new_page()
    anon.on("pageerror", lambda e: errs.append(str(e)))
    anon.goto(BASE, wait_until="networkidle")
    anon.wait_for_selector("main h1", timeout=20000)

    bg = anon.evaluate("() => getComputedStyle(document.body).backgroundColor")
    # #E1DCC9, the supplied bone.
    check("bone ground", bg == "rgb(225, 220, 201)", bg)

    cta = anon.evaluate("""() => {
        const el = [...document.querySelectorAll('a')].find(a => a.textContent.trim().startsWith('Get started'));
        return el ? getComputedStyle(el).backgroundColor : null;
    }""")
    # #1F150C, the supplied warm near-black.
    check("primary CTA is the supplied near-black", cta == "rgb(31, 21, 12)", cta)

    # The supplied palette, and only the supplied palette, at the extremes. Derived tints
    # sit between these, so the check is that all four seeds actually appear somewhere.
    palette = anon.evaluate("""() => {
        const want = {
            'rgb(0, 0, 0)': 0,
            'rgb(31, 21, 12)': 0,
            'rgb(65, 45, 21)': 0,
            'rgb(225, 220, 201)': 0,
        };
        for (const el of document.querySelectorAll('body *')) {
            const s = getComputedStyle(el);
            for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor']) {
                if (s[prop] in want) want[s[prop]]++;
            }
        }
        return want;
    }""")
    missing = [hex_ for hex_, n in palette.items() if n == 0]
    check("all four supplied colours are in use", not missing, f"missing {missing}")

    # Courses render as cards now, not an index list.
    check("landing shows course cards", anon.locator('a[href^="/courses/"]').count() >= 3)
    check("cards are rounded", anon.evaluate("""() => {
        const c = document.querySelector('a[href^="/courses/"]');
        return c ? parseFloat(getComputedStyle(c).borderRadius) >= 8 : false;
    }"""))
    anon.screenshot(path=f"{SHOTS}/u1-landing.png", full_page=True)

    anon.goto(f"{BASE}/courses", wait_until="networkidle")
    anon.wait_for_selector("main h1", timeout=20000)
    check("courses page uses cards too", anon.locator('a[href^="/courses/"]').count() >= 3)
    anon.screenshot(path=f"{SHOTS}/u2-courses.png", full_page=True)

    # ---------- upload ----------
    ictx = b.new_context(viewport={"width": 1440, "height": 1200})
    ins = login(ictx, "instructor@lms.test")
    ins.goto(f"{BASE}/studio/courses/new", wait_until="networkidle")
    ins.wait_for_selector("form", timeout=20000)

    check("upload control present", ins.locator('input[type="file"]').count() > 0)
    check("url fallback still offered", "paste a url" in ins.inner_text("body").lower())

    title = f"Upload Course {STAMP}"
    ins.locator('form input:not([type]), form input[type="text"]').first.fill(title)

    ins.locator('input[type="file"]').first.set_input_files(img)
    ins.wait_for_timeout(6000)

    url_box = ins.locator('input[placeholder="https://"]').first
    uploaded = url_box.input_value()
    check("upload returns a URL", uploaded.startswith("http"), uploaded[:70])
    check("URL points at the backend", "1337" in uploaded and "/uploads/" in uploaded, uploaded[:70])
    check("preview renders", ins.locator('img[src^="http"]').count() > 0)
    ins.screenshot(path=f"{SHOTS}/u3-upload.png", full_page=True)

    # the uploaded file is really served
    served = ins.evaluate(
        "async (u) => (await fetch(u, { method: 'GET' })).status", uploaded
    )
    check("uploaded file is served", served == 200, str(served))

    # save and confirm it sticks
    ins.click('button:has-text("Create course")')
    ins.wait_for_timeout(4500)
    check("course saved with the upload", "/studio/courses/" in ins.url, ins.url)
    course_url = ins.url
    ins.reload(wait_until="networkidle")
    ins.wait_for_selector("form", timeout=20000)
    check(
        "cover persisted",
        ins.locator('input[placeholder="https://"]').first.input_value() == uploaded,
    )

    # oversized file is refused with a message, not silently
    ins.locator('input[type="file"]').first.set_input_files(big)
    ins.wait_for_timeout(6000)
    body = ins.inner_text("body")
    check("oversized file refused", "under 5MB" in body or "5MB" in body, body[:100].replace("\n", " "))

    # clean up
    ins.once("dialog", lambda d: d.accept())
    ins.click('button:has-text("Delete course")')
    ins.wait_for_timeout(4000)
    check("cleaned up", ins.url.rstrip("/").endswith("/studio"), ins.url)
    ictx.close()

    # ---------- a student cannot upload ----------
    sctx = b.new_context()
    stu = login(sctx, "student@lms.test")
    status = stu.evaluate("""async () => {
        const fd = new FormData();
        fd.append('file', new File([new Uint8Array([137,80,78,71])], 'x.png', { type: 'image/png' }));
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        return r.status;
    }""")
    check("student upload refused", status in (403, 400, 415), str(status))
    sctx.close()

    # mobile
    mob = actx.new_page()
    mob.set_viewport_size({"width": 375, "height": 812})
    mob.goto(BASE, wait_until="networkidle")
    mob.wait_for_selector("main h1", timeout=20000)
    ov = mob.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("no h-scroll at 375px", ov <= 0, f"overflow {ov}px")
    mob.close()
    actx.close()

    b.close()

for f in (img, big):
    try:
        os.remove(f)
    except OSError:
        pass

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
