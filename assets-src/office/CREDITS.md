# Office page art credits

Source art for the /office page is turned into `public/office/pack.png` +
`src/office/pack.json` by `scripts/build-office-pack.py`. The site ships
only the built atlas.

## LimeZu — Modern Interiors + Modern Office Revamped (`limezu/`, not in git)
The pack that ships. Furniture, floors and the character generator layers
from https://limezu.itch.io/ (Modern Interiors, Modern Office Revamped),
bought under LimeZu's commercial licence. The licence allows use in a
commercial project with credit and forbids redistributing the raw files, so
`limezu/` is gitignored and only the derived, recoloured atlas is committed.
The four characters are composed from the generator layers (body, eyes,
outfit, hair, accessories) and recoloured in the build script.

The site footer carries the LimeZu credit line.

## pixel-agents (`pixel-agents/`) — fallback, not shipped
Furniture and character sheets from
https://github.com/pixel-agents-hq/pixel-agents — MIT License (see
`pixel-agents/LICENSE`). Their characters are based on JIK-A-4's
"MetroCity – Free Top Down Character Pack" (CC0):
https://jik-a-4.itch.io/metrocity-free-topdown-character-pack
`python3 scripts/build-office-pack.py pixel-agents` rebuilds the 16px
atlas from it if the LimeZu files are ever unavailable. If it ships again,
its credit goes back into the footer.
