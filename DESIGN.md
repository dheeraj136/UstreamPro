<!-- Ustream Design System Specification -->
<!-- Synthesizing Spotify (1st) & Well Go USA (3rd) DESIGN.md from OpenDesignMD -->

# How Ustream is Designed

## 1. Visual Theme & Atmosphere
Ustream combines the **theatrical immersion of cinema film presentation** (Well Go USA) with the **content-first darkness and tactile pill geometry** of a modern streaming app (Spotify).

The design philosophy is **"Content-First Darkness"**:
- The interface recedes into an ultra-dark theater canvas (`#08090d` / `#000000`) so that movie posters, anime artwork, and live match broadcasts become the luminous primary source of color.
- Chrome and surfaces remain strictly achromatic (charcoal `#121212`, card surface `#181818`, interactive container `#1f1f1f`).
- The electric lime accent (`#e7ff51`) is **strictly functional**: reserved for play buttons, active navigation pills, live status dots, and scrubber progress — never used decoratively.
- Geometric harmony: Every button is a full pill (`border-radius: 9999px`), media action triggers and avatars are circular (`50%`), and media cards have comfortable 8px–10px rounding.

---

## 2. Color Palette & Semantic Roles

| Token | Value | Role | Source / Notes |
|---|---|---|---|
| `--bg` / Canvas | `#08090d` | Deepest theater background layer | Light-absorbing base (Well Go USA) |
| `--surface` | `#12141c` | Base component surfaces & backdrops | Spotify `#121212` level 0 |
| `--surface-2` | `#181a24` | Media cards, search inputs, containers | Spotify `#181818` level 1 |
| `--surface-3` | `#202330` | Hover states, elevated panels | Spotify `#1f1f1f` level 2 |
| `--surface-modal` | `rgba(16, 18, 26, 0.96)` | Floating modals & drawers | Tactile blur + deep elevation |
| `--text` / Ink | `#ffffff` | Primary headings, active labels, titles | High contrast (Well Go USA) |
| `--muted` | `#b3b3b3` | Secondary metadata, year, runtime, tags | Spotify silver text |
| `--muted-2` | `#717684` | Inactive tabs, disabled states, borders | Spotify border gray |
| `--line` | `rgba(255, 255, 255, 0.08)` | Hairline dividers, subtle card borders | Inset boundary |
| `--accent` | `#e7ff51` | Electric lime primary action & active | High-visibility functional signal |
| `--accent-hover` | `#f0ff7a` | Interactive hover state for primary CTAs | Tactile feedback |
| `--accent-contrast` | `#08090d` | Text on electric lime buttons | 18:1 contrast ratio |
| `--live-red` | `#ff3b30` | Live broadcast tag & pulsing indicator |

---

## 3. Typography Scale & Hierarchy

| Role | Font Family | Size | Weight | Line Height | Tracking | Text Transform | Use |
|---|---|---:|---:|---:|---:|---|---|
| **Hero Display** | Inter, system-ui | 3.5rem (56px) | 850 | 1.02 | -0.04em | Normal | Main hero title |
| **Section Title** | Inter, system-ui | 1.5rem (24px) | 800 | 1.2 | -0.025em | Normal | Rail & section headers |
| **Section Kicker** | Inter, system-ui | 0.75rem (12px) | 800 | 1.0 | 0.12em | Uppercase | Category kicker tags |
| **Card Title** | Inter, system-ui | 0.875rem (14px) | 700 | 1.25 | -0.015em | Normal | Poster card titles |
| **Metadata Tag** | Inter, system-ui | 0.6875rem (11px) | 600 | 1.3 | 0.02em | Normal | Year, rating, duration |
| **Pill Button** | Inter, system-ui | 0.8125rem (13px) | 750 | 1.0 | 0.04em | Uppercase | Primary & secondary CTAs |
| **Nav Link** | Inter, system-ui | 0.8125rem (13px) | 600 | 1.0 | 0.01em | Normal | Topbar navigation items |

---

## 4. Components & Geometry

### 4.1. Three-Layer Theatrical Hero (Well Go USA)
1. **Layer 0 (Media)**: Full-bleed 4K TMDB backdrop image or motion trailer preview.
2. **Layer 1 (Vignette)**: Dual multi-directional darkening gradients:
   - Horizontal: `linear-gradient(90deg, rgba(8,9,13,0.95) 0%, rgba(8,9,13,0.6) 45%, transparent 100%)`
   - Vertical: `linear-gradient(180deg, rgba(8,9,13,0.2) 0%, rgba(8,9,13,0.7) 60%, var(--bg) 100%)`
3. **Layer 2 (Foreground)**: Left-anchored content with section kicker, condensed title, badge cluster, synopsis, and action bar:
   - **Play Now**: Electric lime full pill (`border-radius: 9999px`, dark ink text, bold uppercase label).
   - **Trailer**: Circular icon button with inline "Trailer" label.
   - **Add to List**: Translucent pill with icon.

### 4.2. Topbar Navigation (Spotify + Well Go USA)
- **Surface**: Floating transparent header with backdrop blur (`backdrop-filter: blur(20px)`), seamless transition to hero.
- **Pills**: Navigation links sit as clean horizontal items; active section highlights with a subtle pill backing.
- **Search Bar**: Full pill container (`border-radius: 9999px`) with inset border (`rgba(255,255,255,0.12) 0 0 0 1px inset`).

### 4.3. Media Cards & Rails (Spotify + Well Go USA)
- **Aspect Ratio**: 2:3 vertical posters (`aspect-ratio: 2 / 3`).
- **Rounding**: `border-radius: 10px` on poster container.
- **Elevation**: Subtle `rgba(0,0,0,0.4) 0 8px 24px` shadow.
- **Hover Reaction**: Smooth `translateY(-4px)` lift with circular play trigger overlay.
- **Rails**: Horizontal scroll with floating circular navigation buttons (`width: 40px; height: 40px; border-radius: 50%`).

### 4.4. Prime X-Ray Details Modal (Spotify Tactile Tabs)
- **Backdrop**: Deep black scrim (`rgba(0,0,0,0.85)`) with 16px blur.
- **Header**: Full-bleed hero banner with gradient vignette.
- **Tab Bar**: Spotify-style pill tabs (Overview, Episodes, X-Ray Cast & Crew, More Like This) with glowing active indicator.
- **Cast Cards**: Circular actor avatars (`border-radius: 50%`) with character captions.

### 4.5. Custom Video Player & Match Centre
- **Scrubber Bar**: Tactile 4px track expanding to 6px on hover, electric lime progress, circular handle.
- **Controls**: 50% circular icon buttons (`width: 36px; height: 36px; border-radius: 50%`).

---

## 5. Do's and Don'ts

### Do:
- **Do** keep the background pitch dark (`#08090d` / `#000000`) so colorful film and anime art pops.
- **Do** use pill geometry (`9999px`) for action buttons and search bars.
- **Do** use circular geometry (`50%`) for play triggers, audio controls, and actor avatars.
- **Do** apply uppercase with wide tracking on buttons (`letter-spacing: 0.04em–0.08em`).
- **Do** keep UI chrome achromatic — color belongs to the media.

### Don't:
- **Don't** use electric lime as a decorative card background — it is strictly an interactive action signal.
- **Don't** use sharp square corners for buttons or floating inputs.
- **Don't** place white hero text directly over raw media without the darkening vignette overlay.
- **Don't** use weak, washed-out shadows on dark backgrounds — depth requires `rgba(0,0,0,0.5)` or deeper.
