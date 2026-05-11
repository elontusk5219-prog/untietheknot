#!/usr/bin/env python3
"""Robust image generator with retries and requests library."""
import json, base64, os, sys, time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

KEY = 'sk-510371f58eb5b5634325f0b002657b48d2d26203fbc8e8df8146d0d4a21749d9'
URL = "https://openai.sufy.com/v1/images/generations"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

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
    # Track 01 - 解开那束结
    ("v_01_jiekai_01", "Two girls walking into the mouth of an old drainage tunnel, one holding a dim flashlight, vines growing over the entrance, their school bags still on their backs, puddles reflecting the tunnel interior"),
    ("v_01_jiekai_02", "A girl parting a curtain of hanging beads in a dark traditional house, the beads catching faint light, another girl waiting behind her, dusty tatami floor, abandoned furniture shapes in shadow"),
    ("v_01_jiekai_03", "Underwater perspective looking up — a girl's hand reaching down through the water surface from above, distorted by ripples, light filtering through creating god-rays, bubbles rising"),
    ("v_01_jiekai_04", "Two girls descending a narrow stone staircase carved into a cliff face, ocean far below barely visible through fog, the steps wet and mossy, one girl reaching back to steady the other"),
    ("v_01_jiekai_05", "A girl standing in front of a massive old torii gate in a forest, completely overgrown with moss and vines, mist so thick the path behind disappears, her scarf blowing sideways"),
    ("v_01_jiekai_06", "A long dark corridor with doors on both sides, all slightly ajar with different colored light — blue amber green — girl walking toward the brightest door at the end"),
    ("v_01_jiekai_07", "An old elevator with the doors jammed half-open, a girl squeezing through sideways, the elevator interior lit by a single emergency bulb, cables visible above, another girl waiting outside"),
    ("v_01_jiekai_08", "A traditional Japanese wooden hallway engawa at night, rain pouring outside, a girl sitting with knees drawn up looking out at the rain-soaked garden, lantern light barely reaching her"),
    ("v_01_jiekai_09", "Two girls at the edge of a forest lake at dusk, one crouching to touch the water, the surface perfectly still reflecting the dark treeline and a single bright star"),
    ("v_01_jiekai_10", "A girl pushing open massive wooden temple doors from inside, bright white light flooding in from outside, her silhouette black against the light, dust motes swirling in the beam"),

    # Track 02 - Flight To Paris (捕风捉影 mapped here)
    ("v_02_paris_01", "Two girls at an airport observation deck at night, pressing faces against glass, a plane taxiing on the runway below, its lights reflecting on the wet tarmac, their breath fogging the glass"),
    ("v_02_paris_02", "Interior of a red-eye flight, all passengers sleeping, one girl awake by the window watching lightning in distant clouds below, her face lit intermittently by the flashes"),
    ("v_02_paris_03", "Two girls sharing a tiny umbrella running through a rain-soaked Parisian street at night, cobblestones reflecting neon signs, both laughing with wet hair"),
    ("v_02_paris_04", "A rice paddy at twilight, two girls walking along the narrow raised path between flooded fields, fireflies beginning to appear, distant mountains silhouetted against dying light"),
    ("v_02_paris_05", "A girl sitting on a suitcase at a train platform, another girl running toward her in the distance, the train already pulling away, platform lights creating halos in the humid air"),
    ("v_02_paris_06", "Two girls on an overnight ferry deck, leaning on railing, the sea black except for moonlight, the ship's wake glowing faintly bioluminescent, wind blowing their hair"),
    ("v_02_paris_07", "A girl photographing another girl from across a busy crosswalk at night, the other girl unaware, traffic lights creating streaks, pedestrians blurred around them"),
    ("v_02_paris_08", "A girl on a fire escape reaching out to catch snow, city skyline behind her, another girl watching from window inside, warm interior light vs cold blue exterior"),
    ("v_02_paris_09", "Empty playground at dusk, two girls on swings, one swinging high while the other sits still, scattered leaves and sparkle-like dust motes in the dying golden light"),
    ("v_02_paris_10", "Two girls walking through a tunnel underpass, graffiti walls, a busker's abandoned guitar case, their shadows stretching long from the tunnel entrance light behind them"),

    # Track 03 - 蜂蜜
    ("v_03_honey_01", "Two girls on a narrow apartment balcony at night, one sitting on the railing dangerously, the other gripping her sleeve, city lights bokeh behind, a jar of something amber between them"),
    ("v_03_honey_02", "A girl braiding another girl's hair in a dimly lit bathroom, mirror reflecting both, counter cluttered with hairpins and products, a single warm bulb above the mirror"),
    ("v_03_honey_03", "Two girls on a high-rise rooftop, one playing ukulele while the other lies with head in her lap, city skyline behind, string lights draped over the railing"),
    ("v_03_honey_04", "Rooftop garden at night, overgrown plants in makeshift planters, two girls sharing earbuds looking at a phone screen that illuminates their faces, moths circling a lamp"),
    ("v_03_honey_05", "A girl pouring honey from a jar into tea in a tiny kitchen, golden light from the honey catching lamplight, another girl sitting on the counter swinging legs, intimate domestic scene"),
    ("v_03_honey_06", "Two girls asleep on a small couch, tangled together with a shared blanket, TV casting blue light on them (screen not visible), an alarm clock showing 3am, tissues and snacks around"),
    ("v_03_honey_07", "A girl reaching through a chain-link fence to hand something to the other girl on the other side, sunset behind them turning everything amber, their fingers almost touching through the diamonds"),
    ("v_03_honey_08", "Two girls in a laundromat at 2am, sitting on top of washing machines, one doing homework, fluorescent lights buzzing, rain visible through the glass storefront, spinning drums creating light patterns"),
    ("v_03_honey_09", "A girl applying a band-aid to another girl's knee on outdoor concrete steps, a fallen bicycle nearby, late afternoon light, scattered contents of a tipped-over school bag"),
    ("v_03_honey_10", "Building rooftop party aftermath — just two girls remaining, fairy lights still on, scattered cups, sitting back to back at the roof edge, contemplative, city hum below"),

    # Track 04 - 象形文字
    ("v_04_hieroglyph_01", "A girl tracing carved symbols on a moss-covered stone wall in a dark cave, her flashlight beam narrow, the carvings look ancient and mysterious, water dripping from above"),
    ("v_04_hieroglyph_02", "Inside an airplane cabin at night, a girl asleep against the window, seatback screen showing a paused home video of two friends laughing, moonlit clouds visible outside"),
    ("v_04_hieroglyph_03", "Two girls in a dusty library archive, pulling out drawers of old card catalogs, dust motes in shaft of light from a high window, stacks of papers and books everywhere"),
    ("v_04_hieroglyph_04", "A girl writing on a foggy bus window with her finger — backward characters that the other passengers can't read, night cityscape scrolling past outside, bus interior dim"),
    ("v_04_hieroglyph_05", "A highway overpass at night from below, a girl sitting on the concrete slope underneath, cars passing above creating rhythmic light-shadow-light, graffiti tags around her"),
    ("v_04_hieroglyph_06", "Two girls in an abandoned classroom, old desks scattered, one girl at the blackboard drawing something, chalk dust floating, broken windows letting in streetlight"),
    ("v_04_hieroglyph_07", "A girl looking at old photos scattered on a bed, some face-down, one showing two younger girls at a festival, bedside lamp warm, rest of room dark"),
    ("v_04_hieroglyph_08", "Night street with a girl crying under a convenience store awning while rain pours, mascara slightly smudged, fluorescent store light behind her, another girl approaching with an umbrella"),
    ("v_04_hieroglyph_09", "Two girls at a night market fortune-telling stall, the fortune teller's table lit by candles, tarot cards spread out, hanging cloth partitions, mysterious shadows"),
    ("v_04_hieroglyph_10", "A girl sitting at a piano in a dark recital hall, single spotlight on her, another girl lying under the piano listening, the hall empty and echoey, sheet music scattered on floor"),

    # Track 05 - 捕风捉影 (chasing wind and shadows)
    ("v_05_flight_01", "Two girls chasing each other through a field of tall grass at golden hour, one looking back with outstretched hand, grass bending in wind, their silhouettes semi-transparent against sun"),
    ("v_05_flight_02", "A girl on a rooftop trying to catch floating dandelion seeds, arms outstretched, wind whipping her hair horizontally, city below, another girl watching from the rooftop door"),
    ("v_05_flight_03", "Two girls running through rain down a steep hillside stairway in a residential area, grabbing the railing, puddles splashing at each step, shared jacket held over their heads"),
    ("v_05_flight_04", "Airplane cabin aisle at 3am, everyone sleeping, one girl walking barefoot toward back galley, exit signs casting red light, a blanket trailing from her hand"),
    ("v_05_flight_05", "A girl chasing a scarf caught by wind across a parking lot at dusk, the scarf impossibly high and far, the other girl already given up chasing and laughing"),
    ("v_05_flight_06", "Two girls at the very end of a train platform, beyond the yellow line, watching the last train leave without them, its red taillights shrinking, wind from its departure blowing their hair"),
    ("v_05_flight_07", "A girl trying to photograph a bird that keeps flying away, getting increasingly frustrated, telephoto lens extended, on a bridge railing, the other girl pointing at where the bird went"),
    ("v_05_flight_08", "Two girls on bicycles racing downhill on an empty residential street, wind in hair, one slightly ahead looking back, the hill steep enough to see rooftops of lower buildings"),
    ("v_05_flight_09", "A kite tangled in power lines, a girl below looking up at it helplessly, her hand still holding the broken string, wind still blowing, another girl arriving to see what happened"),
    ("v_05_flight_10", "Dawn wind blowing cherry blossom petals through an open corridor at a school, one girl trying to catch them, the other watching, the wind creating a tunnel of pink petals"),

    # Track 06 - 得到你的爱
    ("v_06_love_01", "Two girls at a DDR arcade machine, both on the dance pads mid-step, screen showing arrows, the arcade dark except for machine glow, their synchronized movement"),
    ("v_06_love_02", "A girl winning a claw machine prize — a small plush — and turning excitedly to show another girl, the machine's rainbow lights casting colors on their faces, mall corridor"),
    ("v_06_love_03", "Two girls sharing one milkshake with two straws at a retro diner booth, jukebox glowing in background, checkered floor, ketchup and fries on the table, warm tungsten lighting"),
    ("v_06_love_04", "A girl tying a friendship bracelet onto another girl's wrist, close-up of their hands, sitting on a park bench, autumn leaves on the ground, late afternoon golden backlight"),
    ("v_06_love_05", "Two girls in a photo booth, curtain half drawn, one making a peace sign, the other surprised by the flash, strip of previous photos hanging from the dispenser"),
    ("v_06_love_06", "A girl teaching another girl to ride a skateboard in an empty parking garage, holding her hands for balance, fluorescent garage lights overhead, painted lane markings"),
    ("v_06_love_07", "Two girls racing in arcade racing game, split screen visible, both leaning into turns, arcade bathed in multicolored game light, competitive joy on faces"),
    ("v_06_love_08", "Two girls in a record store flipping through vinyl, one holding up an album cover to show the other, warm yellow store lighting, posters on walls, cramped aisles"),
    ("v_06_love_09", "A girl pushing another girl on a shopping cart through an empty parking lot at night, both laughing, streetlights overhead, the cart slightly out of control"),
    ("v_06_love_10", "Two girls in matching arcade staff uniforms cleaning up after hours, one sweeping cherry blossom petals that blew in, other counting tokens, warm closing-time atmosphere"),

    # Track 07 - 咒语之声
    ("v_07_spell_01", "A girl whispering into the other girl's ear at a crowded festival, fireworks about to launch, anticipation, the crowd around them blurred, only they are in focus"),
    ("v_07_spell_02", "Two girls at a shrine at night, one ringing the bell with the thick rope, sound waves visualized as subtle ripples in the air, shrine lanterns casting warm pools"),
    ("v_07_spell_03", "A girl singing karaoke alone in a tiny booth, the other girl watching through the door's small window from outside, neon karaoke sign reflected in the glass"),
    ("v_07_spell_04", "Two girls writing wishes on ema wooden tablets at a shrine, their wishes facing away from camera, other ema hanging densely, evening light through maple trees"),
    ("v_07_spell_05", "After fireworks — smoke hanging over river, two girls walking through dispersing crowd, festival lanterns still lit, spent firework casings on ground, afterglow in sky"),
    ("v_07_spell_06", "A girl reading poetry from a small book to another girl in a cemetery at twilight, sitting between old mossy headstones, fireflies beginning to appear, peaceful not scary"),
    ("v_07_spell_07", "Festival food stall row at night, two girls sharing takoyaki, paper lanterns above, distant fireworks visible between buildings, steam and smoke mixing with festive light"),
    ("v_07_spell_08", "Two girls in a music practice room, one playing cello, the other lying on the floor listening with eyes closed, sheet music everywhere, soundproofing panels on walls"),
    ("v_07_spell_09", "A girl humming while walking along train tracks in golden hour, the other girl walking on the rail with arms out for balance, both barefoot carrying shoes, nostalgic"),
    ("v_07_spell_10", "A girl tying a small bell charm to another girl's bag at a festival stall, the seller watching, dozens of bell charms hanging from the stall display, wind making them ring"),

    # Track 09 - 销声匿迹
    ("v_09_vanish_01", "A girl standing at a bus stop in heavy fog, the bus approaching barely visible, its headlights just two diffused orbs, the girl herself starting to seem translucent at the edges"),
    ("v_09_vanish_02", "An empty school hallway with lockers, one locker open with items spilling out — photos, a scarf, notes — as if someone just emptied their life from it, hallway lights flickering"),
    ("v_09_vanish_03", "A girl's reflection in a dark shop window at night, but the reflection shows her and another girl who isn't there, the real sidewalk behind her empty"),
    ("v_09_vanish_04", "A phone screen showing 'message read' with no reply, the phone held by a girl sitting on a bench in an empty park at night, the screen light on her disappointed face"),
    ("v_09_vanish_05", "A girl walking away down a rain-soaked alley, getting smaller, another girl standing at the alley entrance watching her go, the rain creating a curtain between them"),
    ("v_09_vanish_06", "Vending machine alley at night, multiple machines casting blue-white-orange light, girl standing between them choosing, face lit from below, cats watching from shadows"),
    ("v_09_vanish_07", "Girl in mirror maze touching glass to find way out, handprints left on every surface, some panels showing distorted reflections, disorienting perspective"),
    ("v_09_vanish_08", "A convenience store at 3am seen from outside through glass, a girl alone inside browsing shelves aimlessly, harsh fluorescent light making her look pale, empty parking lot"),
    ("v_09_vanish_09", "24-hour diner shot through window from outside in rain, girl alone in booth writing in notebook, warm yellow interior vs cold blue rainy street"),
    ("v_09_vanish_10", "Train pulling out of station, a girl on the platform watching it go, through the train windows we glimpse another girl inside not looking back, platform emptying"),

    # Track 10 - Dream Big (做大梦)
    ("v_10_dream_01", "Car interior at night, girl driving on empty highway, rain streaming down windshield, dashboard lights glowing green and blue, taillights of distant truck ahead, wipers mid-sweep"),
    ("v_10_dream_02", "View through rain-covered windshield, highway stretching straight into darkness, power line poles rhythmically passing, headlights cutting through mist, dreamlike atmosphere"),
    ("v_10_dream_03", "Girl in passenger seat of parked car on cliff overlook, city lights spread below like galaxy, rain on windows, feet on dashboard, contemplative mood"),
    ("v_10_dream_04", "Highway driving at night, massive full moon low on horizon ahead, power lines crossing sky, road perfectly straight, girl's hands on steering wheel, surreal scale"),
    ("v_10_dream_05", "Car stopped at empty gas station at night, fluorescent canopy light, girl leaning on car looking at stars, moths circling lights, highway stretching both directions"),
    ("v_10_dream_06", "Car interior during tunnel drive, orange sodium lights creating rhythmic strobing, girl's face intermittently lit and shadowed, tunnel seeming infinite"),
    ("v_10_dream_07", "Two girls in car at drive-in movie, screen showing blurry romantic scene, rain on windshield distorting projection, dashboard reflecting movie light"),
    ("v_10_dream_08", "Girl driving through residential area at 4am, all houses dark, street lamps creating pools of light, cat crossing road caught in headlights, pre-dawn blue sky"),
    ("v_10_dream_09", "A girl sitting on the hood of a parked car in an empty parking lot, looking up at the stars, the car's headlights still on pointing at nothing, a highway overpass overhead"),
    ("v_10_dream_10", "Pre-dawn highway, the sky just starting to lighten at the horizon, a small car driving toward it, the road perfectly straight, power lines sagging between poles, the promise of somewhere new"),

    # Track 12 - 看完花火再回
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

SESSION = requests.Session()
SESSION.headers.update({
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
})

def gen(name, prompt, max_retries=4):
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
    for attempt in range(max_retries):
        try:
            resp = SESSION.post(URL, json=body, timeout=180)
            resp.raise_for_status()
            data = resp.json()
            b64 = data['data'][0]['b64_json']
            with open(fpath, 'wb') as f:
                f.write(base64.b64decode(b64))
            return f"✅ {name}"
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                time.sleep(wait)
            else:
                return f"❌ {name}: {e}"
    return f"❌ {name}: all retries failed"

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # Only run missing ones
    missing = [(n, p) for n, p in JOBS if not os.path.exists(os.path.join(OUT, f"{n}.png"))]
    total = len(missing)
    if total == 0:
        print("All images exist!")
        sys.exit(0)
    done = 0
    print(f"Generating {total} missing images (PS3 game style) with 2 workers + retries...")
    print(f"Output: {OUT}\n")
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(gen, n, p): n for n, p in missing}
        for f in as_completed(futures):
            done += 1
            print(f"[{done}/{total}] {f.result()}")
            sys.stdout.flush()
    generated = len([f for f in os.listdir(OUT) if f.startswith('v_') and f.endswith('.png')])
    print(f"\nTotal variant images: {generated}")
