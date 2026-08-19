# Madiun Memory — Code / System Checklist

## App shell
- [ ] React view routing/state for Game / History / Settings
- [ ] Responsive top navigation
- [ ] Fullscreen API
- [ ] Persistent UI preferences
- [ ] Error boundary
- [ ] Loading state
- [ ] Asset loading progress
- [ ] Mobile/touch input strategy
- [ ] Keyboard input hints

## Phaser integration
- [ ] Single Phaser Game instance lifecycle
- [ ] Scene registry
- [ ] Scene transition manager
- [ ] Resize handling
- [ ] Pause/resume when browser tab loses focus
- [ ] Debug mode toggle
- [ ] FPS/debug overlay during development
- [ ] Asset preloader scene

## Story flow
- [ ] Title screen
- [ ] Credits sequence
- [ ] Opening montage
- [ ] Friend dialogue
- [ ] Glitch trigger
- [ ] First chase tutorial
- [ ] Safe room / hiding spot
- [ ] City exploration
- [ ] Card discovery
- [ ] Card insertion
- [ ] Scenario loading transition
- [ ] Historical scenario
- [ ] Scenario return
- [ ] Repeat loop
- [ ] Final scenario
- [ ] Ending
- [ ] Post-game material unlock

## Narrative data
- [ ] Scenario JSON / TypeScript data
- [ ] Dialogue data
- [ ] Character data
- [ ] Memory card data
- [ ] Objectives
- [ ] Puzzle definitions
- [ ] Collectible definitions
- [ ] Achievement definitions
- [ ] Unlock conditions
- [ ] Historical source notes
- [ ] Source citation metadata

## Exploration system
- [ ] Player controller
- [ ] Collision map
- [ ] Interaction zones
- [ ] NPC pathing
- [ ] Trigger zones
- [ ] Hidden item detection
- [ ] Door interaction
- [ ] Scene boundaries
- [ ] Camera follow
- [ ] Camera bounds
- [ ] Map markers
- [ ] Known-route navigation (optional)

## Memory card system
- [ ] Card inventory
- [ ] Card categories
- [ ] Card discovery state
- [ ] Card slot UI
- [ ] Card inspection
- [ ] Card insertion animation
- [ ] Scenario unlock validation
- [ ] RNG table
- [ ] Duplicate handling
- [ ] Collection progress
- [ ] Card-to-history-page link

## Scenario system
- [ ] Scenario manager
- [ ] Scenario loading
- [ ] Scenario map data
- [ ] Scenario NPCs
- [ ] Scenario interactions
- [ ] Scenario puzzle state
- [ ] Scenario completion condition
- [ ] Scenario rewards
- [ ] Scenario replay
- [ ] Scenario reset
- [ ] Historical accuracy review field

## Dialogue system
- [ ] Typewriter text
- [ ] Continue input
- [ ] Speaker name
- [ ] Portrait switching
- [ ] Emotion variants
- [ ] Choice buttons
- [ ] Branching dialogue state
- [ ] Skip
- [ ] Auto-play
- [ ] Text speed option

## Puzzle system
- [ ] Generic puzzle interface
- [ ] Sequence puzzle
- [ ] Matching puzzle
- [ ] Route/path puzzle
- [ ] Timeline ordering puzzle
- [ ] Object inspection puzzle
- [ ] Clue board (optional)
- [ ] Hint system
- [ ] Puzzle success/fail state
- [ ] Puzzle rewards

## Chase system placeholder
- [ ] First-person camera framing
- [ ] Lane system
- [ ] Forward motion
- [ ] Obstacle spawn table
- [ ] Jump/slide/interact input
- [ ] Near-miss event
- [ ] Chase objective
- [ ] Chase end condition
- [ ] Difficulty ramp
- [ ] Fail/retry
- [ ] Transition back to top-down

## Achievement system
- [ ] Achievement IDs
- [ ] Trigger conditions
- [ ] Unlock queue
- [ ] Toast animation
- [ ] Achievement screen
- [ ] Persistent completion state

## Forum / material system
- [ ] Article list
- [ ] Article detail page
- [ ] Search
- [ ] Filter by period/topic/location
- [ ] Timeline view
- [ ] Source list
- [ ] Image gallery
- [ ] Historical glossary
- [ ] “Seen in game” links
- [ ] “Learn more” links

## Saving / persistence
- [ ] LocalStorage schema
- [ ] Save versioning
- [ ] Save migration
- [ ] Card collection persistence
- [ ] Achievement persistence
- [ ] Scenario progress persistence
- [ ] Settings persistence
- [ ] Reset-save option
- [ ] Future login adapter (later; not in this prototype)

## Production / Vercel
- [ ] Production build
- [ ] Asset path verification
- [ ] Compression review
- [ ] Image size review
- [ ] Audio size review
- [ ] Performance test on low-end laptop
- [ ] Mobile browser test
- [ ] Fullscreen test
- [ ] Browser back/forward behavior
