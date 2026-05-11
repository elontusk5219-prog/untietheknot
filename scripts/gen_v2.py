#!/usr/bin/env python3
"""Generate variant images — PS3 real-time render style, correct clothing."""
import json, base64, urllib.request, os, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

KEY = 'sk-510371f58eb5b5634325f0b002657b48d2d26203fbc8e8df8146d0d4a21749d9'
URL = "https://openai.sufy.com/v1/images/generations"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

# CORRECTED base style — PS3 real-time game engine, NOT CG cutscene
STYLE = """PS3-era real-time 3D game rendering, like Fatal Frame V: Maiden of Black Water actual gameplay screenshots on Wii U.
Slightly visible polygon edges, game-engine quality textures (not ultra-sharp), subtly flat skin shading, real-time shadow maps with soft edges.
NOT pre-rendered CG, NOT photorealistic, NOT movie quality — it should look like a screenshot from a running game engine circa 2014.
Dark moody atmosphere, volumetric fog, rain and moisture, muted desaturated color palette leaning blue-grey-green.

Characters: two East Asian girls, early 20s.
Girl A: long straight black hair past shoulders, often wears glasses, quiet and thoughtful expression.
Girl B: shorter brown/auburn hair to chin, slightly warmer expression, often has a scarf or hair accessory.

Clothing style — Y2K-adjacent but NOT sexy/revealing: layered knit tops, striped or plain cardigans, plaid pleated skirts with dark tights, school-uniform inspired blouses, light scarves, canvas sneakers or mary janes, denim jackets over dresses, oversized hoodies. Think early-2000s Japanese casual — cozy, layered, modest. Each scene can have different outfits but keep this spirit.

NO text, NO watermarks, NO HUD/UI elements unless specifically requested."""

JOBS = [
    # Track 01 - 解开那束结 (entering memories — liminal spaces, thresholds)
    ("v_01_jiekai_01", "Two girls walking into the mouth of an old drainage tunnel, one holding a dim flashlight, vines growing over the entrance, their school bags still on their backs, puddles reflecting the tunnel interior"),
    ("v_01_jiekai_02", "A girl parting a curtain of hanging beads in a dark traditional house, the beads catching faint light, another girl waiting behind her, dusty tatami floor, abandoned furniture shapes in shadow"),
    ("v_01_jiekai_03", "Underwater perspective looking up — a girl's hand reaching down through the water surface from above, distorted by ripples, light filtering through creating god-rays, bubbles rising"),
    ("v_01_jiekai_04", "Two girls descending a narrow stone staircase carved into a cliff face, ocean far below barely visible through fog, the steps wet and mossy, one girl reaching back to steady the other"),
    ("v_01_jiekai_05", "A girl standing in front of a massive old torii gate in a forest, completely overgrown with moss and vines, mist so thick the path behind disappears, her scarf blowing sideways"),
    ("v_01_jiekai_06", "Abandoned swimming pool at night, empty except for ankle-deep rainwater, a girl sitting on the diving board looking down at her own reflection, moonlight making the tiles glow faintly blue"),
    ("v_01_jiekai_07", "Two girls standing at the threshold of an old wooden house, the door slides open to reveal complete darkness inside, cicada shells on the doorframe, summer evening light behind them"),
    ("v_01_jiekai_08", "A girl walking through a field of tall pampas grass taller than her head, parting the stalks with her arms, the setting sun turning everything into golden silhouettes, another girl's voice calling from somewhere ahead"),
    ("v_01_jiekai_09", "A crumbling observation deck on a hilltop, telescope rusted in place, two girls looking out at a city that's half-hidden by rolling fog, wind turbines visible on distant ridges"),
    ("v_01_jiekai_10", "An old photo booth in a shuttered arcade, the only thing still powered, one girl sitting inside its glow while the other peers in from outside, their faces lit by the booth's fluorescent tube"),

    # Track 02 - 捕风捉影 (chasing ephemeral things — movement, wind, fleeting)
    ("v_02_paris_01", "A girl chasing a plastic bag caught by wind through an empty train platform at dusk, her pleated skirt and scarf trailing, the electronic departure board showing all cancelled trains"),
    ("v_02_paris_02", "Two girls on a pedestrian overpass at night, one blowing soap bubbles that catch the sodium streetlight below, the bubbles floating down toward passing cars like tiny planets"),
    ("v_02_paris_03", "A girl leaning out of a moving train window, her hair and scarf streaming behind her, countryside blurring past in twilight, another girl inside the car watching her with worried affection"),
    ("v_02_paris_04", "Two girls trying to catch fireflies in glass jars at the edge of a rice paddy at dusk, their shoes muddy, the sky still pink at the horizon, a single farmhouse light in the distance"),
    ("v_02_paris_05", "A girl running barefoot along a rain-soaked shopping street after closing time, metal shutters down on all shops, her reflection running beneath her in the wet concrete, umbrella abandoned behind her"),
    ("v_02_paris_06", "Two girls lying face-up on a merry-go-round in an empty playground, spinning slowly, the sky wheeling above them, autumn leaves caught in the rotation, their hair fanning outward"),
    ("v_02_paris_07", "A girl photographing her own shadow on a sunlit wall, but the shadow shows two figures — her and someone no longer there, late afternoon light stretching everything impossibly long"),
    ("v_02_paris_08", "Two girls on bicycles coasting down a long hill at twilight, no hands on handlebars, a dog running alongside them, power lines overhead converging toward the vanishing point"),
    ("v_02_paris_09", "A girl standing at the edge of a train platform as an express train blasts through without stopping, her skirt and hair blown violently sideways, newspapers flying, a frozen moment of force"),
    ("v_02_paris_10", "Two girls walking along railroad tracks through a bamboo forest, the tracks overgrown and clearly unused, light filtering through bamboo creating green-gold bars across their path"),

    # Track 03 - 蜂蜜 (rooftop intimacy — warmth within cold)
    ("v_03_honey_01", "Two girls on a rooftop wrapped in one oversized blanket, sharing earbuds, city lights spread below them like a second sky, empty bento boxes beside them, breath visible in cold air"),
    ("v_03_honey_02", "A girl cutting the other's hair on a rooftop at sunset, newspaper spread under the chair, clippings blowing away in the breeze, the cutter concentrating with scissors, the sitter laughing"),
    ("v_03_honey_03", "Two girls asleep back-to-back in sleeping bags on a rooftop, a portable radio between them still playing, the Milky Way faintly visible above the light pollution, their shoes lined up neatly"),
    ("v_03_honey_04", "A girl reading aloud from a book by flashlight on a rooftop, the other girl lying with her head on the reader's thigh, eyes closed, laundry hanging on lines above them like flags"),
    ("v_03_honey_05", "Two girls cooking instant ramen on a portable stove on a rooftop, steam rising into cold night air, the pot light between their faces, city traffic a distant murmur below"),
    ("v_03_honey_06", "A rooftop at pre-dawn, one girl already awake drawing in a sketchbook, the other still sleeping in a sleeping bag, the first pink light hitting the water tanks and antenna"),
    ("v_03_honey_07", "Two girls dancing clumsily on a rooftop to music from a phone propped against a ventilation unit, laughing, their elongated shadows moving across the concrete floor"),
    ("v_03_honey_08", "A girl showing the other a constellation through a cardboard tube telescope on a rooftop, pointing at the sky, their breath making small clouds, a thermos of tea between them"),
    ("v_03_honey_09", "Two girls sitting on the edge of a rooftop with their legs dangling, sharing a pair of binoculars to spy on the apartment windows across the street, giggling, nighttime"),
    ("v_03_honey_10", "A rooftop in light rain, two girls not moving to shelter, faces tilted up to the sky with eyes closed, their cardigans getting soaked, a strange peaceful surrender to the weather"),

    # Track 04 - 象形文字 (mixed narrative — journeys, transitions, departures)
    ("v_04_hieroglyph_01", "Two girls on a scooter crossing a long concrete bridge over a dry riverbed, the bridge has no railing, weeds growing through cracks, the girl behind resting her chin on the driver's shoulder"),
    ("v_04_hieroglyph_02", "A girl pressing her face against a bus window, drawing a small heart in the condensation, the outside showing a highway rest stop at night with a single vending machine glowing"),
    ("v_04_hieroglyph_03", "Two girls sitting on suitcases in an empty airport terminal at 4am, fluorescent lights too bright, one asleep leaning on the other, departure board showing DELAYED on every line"),
    ("v_04_hieroglyph_04", "A girl standing on a pedestrian overpass at golden hour, watching a bullet train cross below in a silver blur, her scarf caught in the draft, the movement frozen in a long exposure feeling"),
    ("v_04_hieroglyph_05", "Two girls in the back of a pickup truck driving through countryside at dusk, sitting on blankets, their hair and scarves whipping in the wind, the road receding behind them into deepening blue"),
    ("v_04_hieroglyph_06", "A girl sitting alone at a ramen counter late at night, the cook's back visible, steam everywhere, her reflection in the window overlaid with the rainy street outside, an empty stool beside her"),
    ("v_04_hieroglyph_07", "Two girls at a ferry terminal, one already past the ticket gate looking back, the other on the other side reaching through the barrier, the ferry horn blowing, rain starting"),
    ("v_04_hieroglyph_08", "A girl tracing characters in the dust on an old classroom blackboard with her finger, late afternoon sun streaming through dirty windows, desks stacked against the walls, demolition notice on the door"),
    ("v_04_hieroglyph_09", "Two girls sharing one seat on a mostly-empty late night bus, heads leaned together asleep, streetlights strobing through windows rhythmically, the driver visible in the mirror"),
    ("v_04_hieroglyph_10", "A girl standing at the bow of a small river ferry, looking upstream into fog, traditional houses along the riverbank, a heron taking flight from a concrete wall, her friend sitting behind her reading"),

    # Track 05 - Flight to Paris (confinement, screens, altitude, blue isolation)
    ("v_05_flight_01", "Airplane cabin at night, a girl watching the seatback screen which shows a shaky camcorder video of a birthday party, her face half-lit blue by the screen, everyone else asleep around her"),
    ("v_05_flight_02", "A girl's hand touching a cold airplane window from inside, frost crystals forming around her fingertips, above-clouds sunrise visible, her friendship bracelet a pop of faded color"),
    ("v_05_flight_03", "Inside an airplane lavatory, claustrophobically small, a girl sitting on the closed toilet lid staring at her phone showing zero signal bars, harsh blue fluorescent light, turbulence making things shake"),
    ("v_05_flight_04", "A girl walking down the airplane aisle at 3am, blanket draped over shoulders like a cape, all window shades down except one far ahead leaking blue moonlight, sleeping passengers on either side"),
    ("v_05_flight_05", "Airplane tray table with a collection of items spread out: a boarding pass, a folded letter, a friendship bracelet, earbuds, a half-eaten rice ball — a girl's hand hovering over them"),
    ("v_05_flight_06", "View from the airplane window: a thunderstorm far below, lightning silently illuminating cloud formations, the wing visible, a girl's reflection ghostly in the glass watching the storm"),
    ("v_05_flight_07", "Airport boarding gate, pre-dawn, a girl sitting alone in a row of empty seats, her backpack and a guitar case beside her, the gate number glowing, ground crew visible through the window"),
    ("v_05_flight_08", "Two airplane windows side by side: through one you see sunrise, in the other a sleeping girl's face is reflected with the dark cabin behind her, creating a double-exposure of light and loneliness"),
    ("v_05_flight_09", "A girl emerging from the jet bridge into the foreign airport terminal, harsh artificial light after the dim cabin, crowds moving around her, she stands still looking overwhelmed, bag on one shoulder"),
    ("v_05_flight_10", "Airplane taxiing at night, shot from inside — a girl watching the runway lights blur as the plane turns, her window full of blue taxiway lights arranged in geometric lines, contemplative"),

    # Track 06 - 得到你的爱 (arcade, dance, cherry blossoms, pink dreamscape)
    ("v_06_love_01", "Two girls in a dimly lit arcade, one teaching the other to play a claw machine, hands overlapping on the joystick, pink plush prizes visible through glass, neon signs reflected in their eyes"),
    ("v_06_love_02", "A girl standing on a DDR pad, the screen showing arrow patterns, cherry blossom petals drifting through the open arcade doors, her friend clapping rhythm from the side, game lights on the floor"),
    ("v_06_love_03", "Two girls sharing a crepe on a bench under cherry blossom trees at night, park lampposts creating pools of warm light, petals falling into their hair and onto their skirts"),
    ("v_06_love_04", "Inside a purikura photo booth, the tiny space filled with warm light, two girls making peace signs at the camera, the preview screen showing their photo with sparkle filters, curtain half-drawn"),
    ("v_06_love_05", "Two girls walking through a tunnel of cherry blossoms at night, the trees lit from below with pink uplights, petals thick in the air like snow, their school bags bumping as they walk close"),
    ("v_06_love_06", "A girl sleeping on a bench in the arcade, using her bag as a pillow, the DDR machine behind her still cycling its attract-mode animation, colored light washing over her sleeping face"),
    ("v_06_love_07", "Two girls playing taiko drums in an arcade, drumsticks in hand, both concentrating hard, the screen showing streaming notes, their hair bouncing with each hit, backlit by the game display"),
    ("v_06_love_08", "A girl feeding coins into a jukebox in a retro kissaten coffee shop, the song list glowing amber, cherry blossoms visible through the window, her friend sitting in a leather booth with two cream sodas"),
    ("v_06_love_09", "Cherry blossom viewing picnic — two girls on a blue tarp under a massive old cherry tree, surrounded by fallen petals, bento boxes open, one pouring tea, dappled pink-white light everywhere"),
    ("v_06_love_10", "Two girls leaving the arcade at closing time, the shutters coming down behind them, their pockets full of prize tickets, cherry blossom petals on the sidewalk, a warm spring night"),

    # Track 07 - 新咒语 (fireworks, festival, river, summer heat)
    ("v_07_spell_01", "Two girls in casual summer clothes (not yukata) sitting on a concrete river embankment watching distant fireworks, their legs dangling over the edge, convenience store bags between them, cicadas audible"),
    ("v_07_spell_02", "A girl holding a sparkler at arm's length, the sparks illuminating her face and her friend sitting behind her on the steps, a whole bundle of unused sparklers in a bucket beside them"),
    ("v_07_spell_03", "Two girls running along a riverside path, one pulling the other by the wrist toward the fireworks display, festival-goers in the background as silhouettes, a dropped sandal behind them"),
    ("v_07_spell_04", "View from behind two girls standing on a bridge railing, the firework grand finale exploding ahead of them filling the entire sky, their hair and clothes blown back, water reflecting everything"),
    ("v_07_spell_05", "Festival aftermath — two girls walking home through empty streets, spent firework debris and festival trash around, paper lanterns still lit but askew, a stray cat following them"),
    ("v_07_spell_06", "Two girls lying on a grassy hill above the festival crowd, watching fireworks upside-down from their perspective, the explosions reflected in a nearby irrigation canal"),
    ("v_07_spell_07", "A girl buying two ramune sodas from a festival stall, the blue bottles sweating in summer heat, her friend waiting on a stone wall eating shaved ice, distant firework booms"),
    ("v_07_spell_08", "Two girls on a small fishing boat tied to a dock, watching fireworks from the water, the boat gently rocking, the display reflected in perfectly still harbor water around them"),
    ("v_07_spell_09", "A girl writing something on a tanzaku paper strip at a festival wishing tree, her friend trying to read it over her shoulder, lanterns and firework glow overhead mixing warm and cool light"),
    ("v_07_spell_10", "The last sparkler going out — a girl holding the dead stick, smoke curling up from the tip, her friend already walking ahead on the dark riverpath, summer night insects in the air"),

    # Track 09 - 销声匿迹 (vanishing — lonely urban spaces, isolation, disappearing)
    ("v_09_vanish_01", "A girl's face reflected in a dark train window at night, the sleeping countryside rushing past behind her transparent reflection, she's the last passenger, overhead light buzzing"),
    ("v_09_vanish_02", "A convenience store at 3am, seen from outside through the glass, a girl inside standing motionless in the chip aisle staring at nothing, fluorescent white light making her look like a ghost"),
    ("v_09_vanish_03", "A girl sitting in a coin-operated laundromat watching her clothes spin in the dryer, the only customer, blue-white light, rain on the window, a manga volume open facedown beside her"),
    ("v_09_vanish_04", "An empty karaoke room, the TV screen showing lyrics scrolling with no one singing, a girl sitting on the leather couch holding the mic loosely, two untouched drinks on the table"),
    ("v_09_vanish_05", "A girl walking through an underpass tunnel, her footsteps echoing, fluorescent tubes flickering overhead, water stains on the walls, a single abandoned umbrella propped against the wall"),
    ("v_09_vanish_06", "Three vending machines in a row on a deserted suburban road at night, a girl sitting on the curb between them bathed in their mixed blue-white-orange glow, a cat beside her"),
    ("v_09_vanish_07", "A girl at a public phone booth at night, the booth light on, she's holding the receiver but not dialing, looking at a number written on her palm, moths circling the booth light"),
    ("v_09_vanish_08", "An empty last train, a girl lying across three seats using her bag as a pillow, the overhead ads and handle straps visible, city lights strobing through windows as the train moves"),
    ("v_09_vanish_09", "A 24-hour family restaurant at night, shot through the window from the rainy parking lot, a girl alone in a booth with a cold coffee and an open notebook, warm inside vs cold blue rain outside"),
    ("v_09_vanish_10", "A girl standing at the edge of a dark school pool at night, the water perfectly still reflecting the moon, she's in her school uniform not swimwear, looking at her own reflection"),

    # Track 10 - Dream Big (night driving, roads, headlights, the open road as possibility)
    ("v_10_dream_01", "Car interior at night, a girl driving a small kei car on an empty mountain road, dashboard gauges glowing green, her face half-lit, headlights illuminating only the next curve"),
    ("v_10_dream_02", "View through a rain-spattered windshield, a perfectly straight highway disappearing into darkness, power poles marking rhythm like a metronome, the wipers mid-sweep, dreamlike"),
    ("v_10_dream_03", "Two girls in a parked car at a hilltop overlook, city lights spread below like circuitry, rain dotting the windshield, one girl asleep in the passenger seat, the other watching the view"),
    ("v_10_dream_04", "A car stopped at an empty rural gas station at night, the fluorescent canopy light the only illumination for miles, a girl stretching beside the car, moths orbiting the light"),
    ("v_10_dream_05", "Inside a car driving through an endless tunnel, orange sodium lights strobing rhythmically over the dashboard, a girl's face flashing light-dark-light-dark, the tunnel seeming infinite"),
    ("v_10_dream_06", "Two girls at a drive-in movie screen, the projected image blurred by rain on the windshield into abstract color blocks, their faces dimly lit by the distorted film, snacks on the dashboard"),
    ("v_10_dream_07", "A car on a coastal road at night, the ocean black except where moonlight touches the wave crests, fog creeping across the road from the sea side, guardrail reflectors glowing in headlights"),
    ("v_10_dream_08", "Rearview mirror close-up: a girl's eyes reflected in the mirror, determination and sadness mixed, the highway behind her shrinking to a point, the past literally vanishing"),
    ("v_10_dream_09", "A girl sitting on the hood of a parked car in an empty parking lot, looking up at the stars, the car's headlights still on pointing at nothing, a highway overpass overhead"),
    ("v_10_dream_10", "Pre-dawn highway, the sky just starting to lighten at the horizon, a small car driving toward it, the road perfectly straight, power lines sagging between poles, the promise of somewhere new"),

    # Track 12 - 看完花火再回 (two timelines, return, memory vs present, closure)
    ("v_12_fireworks_01", "Double-exposure effect: a railing by a river, in one layer two young girls watching fireworks together, in the overlaid layer the same railing years later with one girl alone, same fireworks in the sky"),
    ("v_12_fireworks_02", "A girl at a riverside railing at night, one half of her face lit warm orange by fireworks, the other half in cold blue shadow, her expression caught between joy and loss"),
    ("v_12_fireworks_03", "A girl riding a scooter past the spot where she once watched fireworks, the railing and river visible, but the sky is empty now — however in a rain puddle on the road, fireworks are reflected"),
    ("v_12_fireworks_04", "A bridge at night, a girl walking away from camera toward the far end, her shadow on the wet pavement shows two people walking side by side, fireworks going off behind her, she doesn't look back"),
    ("v_12_fireworks_05", "Morning after the festival, a girl walking along the river picking up spent sparklers from the ground, dawn light turning everything soft pink, festival banners being taken down by workers"),
    ("v_12_fireworks_06", "Two girls silhouetted against the final firework burst, but the image has a vertical split — left side warm and slightly blurred like a memory, right side sharp and cold and present"),
    ("v_12_fireworks_07", "A girl on a scooter stopped at a traffic light, the red light reflecting on the wet road, she looks to her right where another scooter would have been, the empty space beside her meaningful"),
    ("v_12_fireworks_08", "A girl arriving home at dawn on a scooter, parking in front of a quiet apartment building, taking off her helmet, her hair falling down, the first sunlight hitting the building top"),
    ("v_12_fireworks_09", "A girl tying her friendship bracelet knot tighter on her wrist while sitting on a parked scooter, the river and firework cleanup visible behind her, the bracelet faded and fraying but held together"),
    ("v_12_fireworks_10", "Final shot: a scooter riding down an empty dawn road, shot from behind and slightly above, the road ahead opens up wide, the rider's scarf trailing, the whole image suffused with the blue of new morning"),
]

def gen(name, prompt):
    fpath = os.path.join(OUT, f"{name}.png")
    if os.path.exists(fpath):
        return f"⏭ {name} (exists)"
    body = {
        "model": "openai/gpt-image-2",
        "prompt": f"{STYLE}\n\n{prompt}",
        "size": "1024x1024",
        "quality": "medium",
        "n": 1
    }
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        raw = urllib.request.urlopen(req, timeout=180).read()
        data = json.loads(raw)
        b64 = data['data'][0]['b64_json']
        with open(fpath, 'wb') as f:
            f.write(base64.b64decode(b64))
        return f"✅ {name}"
    except Exception as e:
        return f"❌ {name}: {e}"

if __name__ == '__main__':
    total = len(JOBS)
    done = 0
    print(f"Generating {total} images (PS3 game style) with 2 workers...")
    print(f"Output: {OUT}\n")
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(gen, n, p): n for n, p in JOBS}
        for f in as_completed(futures):
            done += 1
            print(f"[{done}/{total}] {f.result()}")
            sys.stdout.flush()
    generated = len([f for f in os.listdir(OUT) if f.startswith('v_') and f.endswith('.png')])
    print(f"\nTotal variant images: {generated}")
