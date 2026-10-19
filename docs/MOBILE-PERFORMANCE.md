# Mobile and media performance

The main guest checkout opens the plan selector from the already loaded platform module. Opening plans does not wait for a separate JavaScript download. The admin area and less frequent dialogs remain split into separate modules. Hashed application files live under `/build/` and receive an immutable cache policy; mutable legacy files under `/assets/` do not receive that policy. The unused external font stylesheet was removed.

Only one visible video owns the playback/download slot. A deliberate play action takes priority, and the previous source is removed before the next source is attached. Leaving the viewport, hiding the tab or unmounting releases the slot. Autoplay is muted. Browsers exposing Save-Data or a 2G connection wait for an explicit play instead of consuming bandwidth automatically. This is progressive enhancement; browsers without that information keep normal visible-video playback.

Text inputs use at least 16px on mobile/coarse-pointer devices. VisualViewport tracks the space above the keyboard; scrollable content and composers remain in separate flex regions. Pinch zoom remains enabled. Comments were checked at 320, 360 and 390px in Chrome: no horizontal overflow, 16px input text, and the main content ended at the footer boundary. A physical iOS/Android keyboard was not available for device testing.

The cover setting is named “Modo live — vídeo gravado”. Recorded content keeps a visible “Gravado” label; manually entered audience values are identified as such. This does not implement an actual livestream or measured concurrent viewer count. Public video controls no longer use “prévia”.

## Existing video optimization

`python3 scripts/optimize-videos.py INPUT OUTPUT.mp4` creates a separate, verified MP4. It preserves duration and audio, limits output to 540×960 and 30fps, uses H.264/AAC, and moves the MP4 metadata before media bytes for progressive playback. Originals are retained. Output is kept only when smaller. The reference feed video decreased from 7,512,230 to 5,287,605 bytes (29.61%), with duration/audio checks and faststart passing.

`scripts/optimize-published-media.py` defaults to a read-only plan with a private backup outside the repository. An explicit `--apply PLAN_DIRECTORY --owner-uid UID` processes that fixed plan. It accepts only known video fields, repository MP4 assets and already public MP4 objects from the configured bucket. It retains originals, writes new uniquely named objects, verifies bytes and public playback, and uses Firestore update-time preconditions to skip concurrent edits. It does not change Firebase rules or permissions. Run without credentials in CI only through the mocked unit tests.

New uploads are not automatically transcoded by a background service. Their file size, the visitor's connection and device still determine playback startup and buffering. There is no claim of instant playback on every network or of a measured Lighthouse score.
