# A Young Nurse's Illustrated Primer

An interactive, illustrated web book that teaches how modern AI works. You build an AI telephone-triage nurse
yourself, one idea at a time, in your browser, and watch each version work, then break, then get fixed by the
next idea.

It's 2 a.m. A parent messages about a feverish three-year-old with purple spots that don't fade when a glass
is pressed on them. A good nurse knows this needs an ambulance now. Each chapter asks how much of that nurse
the machine you've built so far can be, and where it fails.

**Read it:** https://sharef.net/nurseprimer/

This book teaches how AI works. It is not medical or triage advice. All patient messages are synthetic.

## Development

```
npm install
npm run dev      # local server
npm run check    # citation audit, tests, build, version stamp, accessibility lint
```

See `CLAUDE.md` for conventions, `docs/plan.md` for the brief and `docs/decisions.md` for decisions since.

## License

Code: MIT. Book content (chapters, illustrations, dataset): CC BY-NC 4.0. See `LICENSE`.
