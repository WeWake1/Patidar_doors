// PROTOTYPE round 4: four cinematic Blender films that play by themselves (the owner's answer: "plays by itself",
// like an Apple hero video, the same on computers and phones). Each is a real MP4 (H.264, 24 fps, ~6 s), muted and
// inline so every phone autoplays it; it plays once and holds its last frame, with a quiet replay button. The
// headline arrives a beat after the film starts. Reduced motion: the last frame, still, and the replay button
// plays it on request. Renders: tools/render/r4/{grand,nightfall,hall,golden}.py, encoded by ffmpeg.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { isWide, prefersReduced } from '../lib/film'
import { Header, LANDMARK, Visit, WA } from '../r3/Shell'
import '../r3/r3.css'
import './r4.css'

const DIR = '/reboot/films/r4'

interface Props {
  film: 'm' | 'n' | 'o' | 'p'
  title: ReactNode
  sub: ReactNode
  /** where the words sit, and whether the frame under them is dark */
  place: 'top-left' | 'bottom-left'
  dark?: boolean
  alt: string
  visit: ReactNode
}

function HeroFilm({ film, title, sub, place, dark, alt, visit }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [wide] = useState(isWide)
  const [reduced] = useState(prefersReduced)
  const [ended, setEnded] = useState(reduced)
  const set = wide ? 'desk' : 'phone'

  useEffect(() => {
    const v = video.current
    if (!v || reduced) return
    v.muted = true
    void v.play().catch(() => setEnded(true)) // autoplay refused (low-power mode): the poster stands, replay plays
  }, [reduced])

  const replay = () => {
    const v = video.current
    if (!v) return
    v.currentTime = 0
    setEnded(false)
    void v.play().catch(() => {})
  }

  return (
    <div className={`rb r3 v4${dark ? ' v4--dark' : ''}`} id="top">
      <Header tone={dark ? 'light' : 'dark'} />
      <section className="v4-hero" aria-labelledby="v4-h">
        <video
          ref={video}
          className="v4-film"
          src={`${DIR}/${film}-${set}.mp4`}
          poster={`${DIR}/${film}-${set}-${reduced ? 'last' : 'first'}.webp`}
          muted
          playsInline
          preload="auto"
          autoPlay={!reduced}
          onEnded={() => setEnded(true)}
          aria-label={alt}
        />
        <div className={`v4-copy v4-copy--${place}${reduced ? ' is-still' : ''}`}>
          <h1 id="v4-h" className="r3-title">
            {title}
          </h1>
          <p className="r3-sub">{sub}</p>
          <div className="r3-ctas">
            <a className="rb-btn" href="/doors">
              See the doors
            </a>
            <a className="rb-btn rb-btn--quiet" href={WA}>
              WhatsApp
            </a>
          </div>
        </div>
        {ended && (
          <button type="button" className="v4-replay" onClick={replay} aria-label="Play the film again">
            <span aria-hidden="true">↻</span> Play again
          </button>
        )}
      </section>
      <Visit title={visit} lead={`${LANDMARK}.`} />
      <footer className="rb-foot">
        Prototype · round 4 · not the live site · door photos are the catalogue’s placeholders
      </footer>
    </div>
  )
}

export const ArrivalII = () => (
  <HeroFilm
    film="m"
    title="The first thing they see."
    sub="Main doors, made to measure for your doorway."
    place="top-left"
    alt="A tall white entrance court in morning sun; stripes of light from its fins fall across the walls, a still rill and a tall teak pivot door."
    visit="Then come and see it."
  />
)

export const Nightfall = () => (
  <HeroFilm
    film="n"
    title="Coming home."
    sub="The door you open every evening, made to measure in our own factory."
    place="top-left"
    dark
    alt="A modern white house at blue hour; the living room glows through tall glass and the teak main door is lit under the overhang."
    visit="Come and choose yours."
  />
)

export const Hall = () => (
  <HeroFilm
    film="o"
    title="Every door in the house."
    sub="Main door, bedrooms, bathrooms: all under one roof, all made to measure."
    place="top-left"
    alt="A bright double-height hall; morning sun through tall glass lays the window's lines across four doors along the wall."
    visit="See them all in one place."
  />
)

export const GoldenHour = () => (
  <HeroFilm
    film="p"
    title="At home in the light."
    sub="Every door made to measure, pressed and finished in our own factory."
    place="top-left"
    alt="A calm living room in the late afternoon; the window's light falls in long shapes across the white wall and a teak door."
    visit="Come and see them in daylight."
  />
)
