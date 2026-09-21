# Getting it onto his laptop

He should never have to install anything, type a command, or know what Node is.
What he needs is a web page.

`index.html` in this repo **is** that page. Everything is baked into that one
file — all the topics, cards, videos, exam questions, the lot. It needs no
internet connection, no install, and no permissions. It works on a school
laptop, a Chromebook, a phone, or a USB stick.

Rebuild it whenever you add or change a pack:

    study build

## Getting it to him

Pick whichever his school allows. They are listed easiest-first.

### 1. The link (this is what we set up)

### https://jamiesobczyk-home.github.io/study-os/

Served by GitHub Pages from this repository. He bookmarks it once and that is
the end of his involvement in the setup — pushing a new pack updates the page
automatically, with nothing to re-send.

To enable it, or if it ever stops working:

1. <https://github.com/jamiesobczyk-home/study-os/settings> → **Danger Zone** →
   *Change visibility* → **Public**. Free GitHub Pages requires this. The repo
   holds IB Biology revision material and code — no names, no personal data,
   and his progress is saved in his browser rather than in the repo.
2. <https://github.com/jamiesobczyk-home/study-os/settings/pages> → Source:
   **Deploy from a branch** → Branch: **main** / **/ (root)** → Save.

Give it a minute or two on first publish. The Actions tab shows the deploy.

**If you would rather keep the repository private**, Cloudflare Pages and
Netlify both have free tiers that serve from a private repo and give the same
always-current link. More setup, no visibility trade-off.

### 2. OneDrive or Google Drive

Put `index.html` in a shared folder. He opens it and it runs locally in his
browser. Works on most locked-down machines because nothing is installed and
nothing is executed outside the browser.

If his school blocks opening local HTML from Drive, download it to the desktop
first and double-click that.

### 3. Email it to him

Attach `index.html`. He saves it to the desktop and double-clicks. Crude, but
it always works, and it is a reasonable fallback if the network fights you.

Re-send it when you have added packs — or better, use option 1 so updates are
automatic.

## What he does

Opens the page. That is all.

Bookmark it, and tell him to start with **Today**.

## The one thing to explain to him

Progress is saved **in the browser he studies in**. School laptop and home
computer keep separate records.

Two ways to live with that:

- **Pick one device** and study there. Simplest, and what most people should do.
- **Carry progress across.** Progress → *Copy my progress* on one device,
  *Paste progress in* on the other. It merges rather than overwrites, keeping
  whichever record is further along, so doing it in either direction is safe.

Clearing browser data will wipe it. The *Download backup* button on the
Progress screen writes a file worth keeping occasionally.

## If the page will not open at school

Almost always one of:

- **The file was saved as `.txt`.** Some mail clients rename attachments.
  Rename it back to `index.html`.
- **A blocked domain**, if you used a hosted link. Fall back to option 2 or 3 —
  a local file bypasses the network entirely.
- **YouTube blocked.** The page still works: all the cards, exam questions and
  mark schemes are in the file. Only the video links need YouTube, and he can
  watch those at home.
