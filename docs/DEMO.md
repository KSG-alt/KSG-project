# The standalone demo

`docs/kadia-demo.html` is the whole admin dashboard in one file. Double-click
it, or attach it to an email. No server, no install, no network.

## What a viewer can actually do

Everything in the prototype works, because it is the prototype — the same
build, not a slideshow of it.

- Read the day's outstanding work on the home screen, safeguarding first.
- Open the menu and move through Reminders, Students, New arrivals, Room
  allocations, Staff, Timetable, Bookings and Kadia.
- Open any student for their full record and their parent or guardian's
  contact details.
- Edit a reminder, complete it, delete it.
- Cancel a timetable session and watch only the affected group re-slot.
- Try to confirm a booking with no receipt and be blocked.

Two things need the viewer's own Anthropic API key, entered in the panel and
held only in their browser: the timetable chat and the Kadia assistant. Without
a key the rest of the demo is unaffected — the panels simply ask for one.

## What it is not

The data is seeded and fake. Every screen says so, and the numbers are
generated, not measured. There is no live centre behind it, no customer, and
no benchmark. Do not describe it as anything else.

The blocked-arrival and outstanding-document counts come from the seed's
generated rates. They demonstrate that the checks work; they are not a claim
about what a real centre's numbers look like.

## Regenerating it

After any change to the app:

```
cd web
npm run build
node build-demo.mjs
```

The build fails loudly rather than silently shipping a broken file: it throws
if any asset path or font stylesheet reference survives inlining, since either
would mean the demo needs the network to render.

`web/fonts/geist-inline.css` holds the Geist faces as data URIs. It only needs
regenerating if the typeface changes.
