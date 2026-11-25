// PROTOTYPE round 5: four more Blender films that play by themselves, on round 4's player (r4/Films.tsx). What
// changed is the filming: a keyframed camera with real motion blur, focus that pulls from near to far, and a grade
// at the encode (a little bloom, a vignette, grain). And something happens in them: the door opens, the camera goes
// in, rain falls. Three are set in the courtyard house behind round 4's pivot door (an aangan with a brass urli of
// marigolds). Renders: tools/render/r5/{shafts,reveal,monsoon,courtyard}.py, queued and encoded as the README says.
import { HeroFilm } from '../r4/Films'
import './r5.css'

const DIR = '/reboot/films/r5'

export const ArrivalFilmed = () => (
  <HeroFilm
    film="q"
    dir={DIR}
    round={5}
    className="v5"
    title="Make an entrance."
    sub="Main doors, made to measure for your doorway."
    place="top-left"
    alt="Leaves out of focus in the foreground; the focus pulls to a tall teak pivot door at the end of a white court striped with morning sun, and the camera moves slowly in."
    visit="Then come and see it."
  />
)

export const ComeIn = () => (
  <HeroFilm
    film="r"
    dir={DIR}
    round={5}
    className="v5"
    title="Come in."
    sub="Main doors and room doors, timber, plywood and boards, all under one roof."
    place="top-left"
    alt="The camera walks up a sunlit white court as the tall teak pivot door swings open, and goes through it into a courtyard: teak columns, a brass urli of marigolds in the sun, a tree, and carved doors across the court."
    visit="Come in and see them."
  />
)

export const Monsoon = () => (
  <HeroFilm
    film="s"
    dir={DIR}
    round={5}
    className="v5"
    title="Come in from the rain."
    sub="Every door in the store, to see, touch and open before you choose."
    place="top-left"
    dark
    alt="Rain falls into an open courtyard; the camera tracks along the dry verandah behind teak columns toward a carved door lit warm across the court."
    visit="Come and see them, rain or shine."
  />
)

export const Courtyard = () => (
  <HeroFilm
    film="t"
    dir={DIR}
    round={5}
    className="v5"
    title="A door for every room."
    sub="Main doors and room doors, made to measure in our own factory."
    place="top-left"
    alt="Straight down on a sunlit courtyard, a brass urli of marigolds at its centre; the camera cranes down and tilts up to rest beside the urli, facing a carved door across the court."
    visit="See them all in one place."
  />
)
