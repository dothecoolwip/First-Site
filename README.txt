BUHURT: STEEL & TAPE — installable version

What's here
  index.html             the whole game
  manifest.webmanifest   name, icon and fullscreen landscape settings for "install"
  sw.js                  offline cache, so it opens without internet after the first visit
  icon-192.png, icon-512.png

Put it online (free), then install it
  GitHub Pages: create a repository, upload these five files, then Settings > Pages >
  Deploy from branch > main / root. Open https://YOUR-NAME.github.io/REPO/ on your phone.
  itch.io: zip these five files, create an HTML project, upload the zip and tick
  "This file will be played in the browser" (itch runs it in a frame: installing works
  best from GitHub Pages).

  Android (Chrome): menu > Install app.  iPhone (Safari): Share > Add to Home Screen.
  It needs https; opening index.html straight from your files plays fine but won't install.

Updating: replace index.html and change VERSION at the top of sw.js so phones fetch the new build.
Online duels and saving photos only work inside Claude (they use the artifact's room and
downloads); everything else works the same here.
