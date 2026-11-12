import { card } from "../card";
import type { Article } from "../types";

export const wartimeSafetyEn: Article[] = [
  card({
    id: "en-mine-booby-traps-danger",
    title: "Booby Traps, UXO & Prohibited Items: Zero Touch Rule",
    shelf: "voina",
    kind: "alarm",
    lang: "en",
    sensitive: "med",
    lead: "Zero Touch Rule. In an active conflict zone, every abandoned item on the ground can be booby-trapped: from phones and flashlights to weapons.",
    keys: ["mines", "booby traps", "tripwire", "IED", "explosives", "UXO", "unexploded", "safety", "zero touch"],
    figure: "booby-trap-danger",
    figureCaption: "Zero Touch Rule: tripwires, disguised gadget traps, and anti-personnel landmines",
    sections: [
      [
        "The Zero Touch Rule",
        [
          "The supreme law of conflict zones: NEVER TOUCH OR PICK UP ANYTHING FROM THE GROUND UNDER ANY CIRCUMSTANCES.",
          "Booby traps are deliberately designed as appealing, valuable, or familiar objects to tempt victims into picking them up or moving them.",
          "Curiosity or scavenging in a gray zone is paid for with life or traumatic limb amputation.",
        ],
      ],
      [
        "Items That Must Never Be Touched",
        [
          "Electronics & Gadgets: Abandoned smartphones, power banks, radios, flashlights, USB drives. The battery compartment is often hollowed out and packed with plastic explosive (C-4/Semtex) and an electric detonator wired to the power switch or tilt sensor.",
          "Domestic Items: Cigarette packs, lighters, soda cans, thermoses, children's toys, dolls, balls, bags, wallets. Toys are rigged specifically to harm civilians.",
          "Military Equipment: Abandoned rifles, ammunition crates, magazines, helmets, plate carriers, first aid kits. Pressure-release booby traps (e.g. ML-7 / MS-3) are commonly set beneath them, detonating the instant the item is lifted.",
          "Casualties & Animal Carcasses: Often mined with tripwires or pressure-release switches underneath. Evacuation must be performed strictly by sappers using grappling hooks from standoff cover.",
          "Abandoned Vehicles: Wired doors, pedals, gas caps, and trunk lids. Opening the latch completes an electrical firing circuit.",
        ],
      ],
      [
        "Tripwires & Hidden Obstacles",
        [
          "A tripwire is an ultra-fine steel wire, copper strand, or dark fishing line strung between a grenade firing pin and an anchor point (tree, peg, doorframe).",
          "Heights of installation: Ankle height (10-15 cm), knee height, or chest height. Hidden in tall grass, debris, building thresholds, and staircase steps.",
          "Avoiding tripwires: Keep eyes on the ground one pace ahead. Do not walk through tall brush or unpaved road shoulders. Illuminate dark entryways at an oblique angle to reveal wire glint or cast shadows.",
          "If your leg snags a wire: FREEZE! Do not move, do not let go of tension, shout a loud warning to companions: 'HALT! TRIPWIRE! GET BACK!'. Locate the explosive body and drop flat in the opposite direction with feet toward the blast.",
        ],
      ],
      [
        "Action Protocol Upon Sighting UXO or Traps",
        [
          "1. STOP: Halt instantly. Do not take another forward step.",
          "2. DO NOT TOUCH: Do not kick, throw stones, or poke with a stick.",
          "3. RETREAT IN YOUR EXACT FOOTSTEPS: Turn around and step precisely into your own footprints back for at least 50-100 meters.",
          "4. MARK THE HAZARD: If safe, leave a clear warning marker at a standoff distance (bright cloth tied to a branch, 'MINES / DANGER' written on pavement).",
          "5. REPORT: Warn everyone in your party and report coordinates to humanitarian demining authorities.",
        ],
      ],
      [
        "Strict Prohibitions",
        [
          "Never attempt amateur demining — modern fuses feature anti-handling devices, magnetic sensors, and anti-removal triggers.",
          "Do not transmit on mobile phones or handheld radios within 10 meters of an unexploded munition — RF emissions can induce current in sensitive electric primers.",
        ],
      ],
    ],
  }),

  card({
    id: "en-mine-pfm1-cluster-uxo",
    title: "Butterfly Mines (PFM-1), Cluster Submunitions & UXO Hazard",
    shelf: "voina",
    kind: "alarm",
    lang: "en",
    sensitive: "med",
    lead: "PFM-1 'Butterfly' scatterable mines, cluster bomblets ('bells'), and unexploded ordnance: treacherous, low-visibility threats in residential and rural terrain.",
    keys: ["butterfly mine", "PFM-1", "cluster bomblet", "submunitions", "UXO", "demining", "landmines"],
    figure: "booby-trap-danger",
    figureCaption: "Visual profile of the PFM-1 butterfly mine and unexploded cluster submunitions",
    sections: [
      [
        "PFM-1 and PFM-1S ('Butterfly / Petal' Mines)",
        [
          "Structure: A small plastic mine weighing only 80 grams (~12 cm long). Consists of a winged aerodynamic body containing liquid explosive (VS-6D).",
          "Camouflage: Molded in green (for vegetation) or khaki/brown (for soil and asphalt). Easily mistaken for a fallen leaf, plastic scrap, or toy.",
          "Trigger: Hydraulic pressure-actuated. Requires only 5 to 25 kg of pressure (a child's footstep, elderly person, or bicycle wheel). Causes catastrophic traumatic amputation of the foot.",
          "Self-Destruction (PFM-1S): Equipped with a pyrotechnic self-destruct timer (1 to 40 hours after deployment). The mine can detonate spontaneously without any physical disturbance at any second!",
        ],
      ],
      [
        "Cluster Submunitions ('Bells', Spherical Bomblets)",
        [
          "Cluster rockets (Grad, Uragan, Smerch, HIMARS, ATACMS) burst mid-air, dispersing hundreds of submunitions across an area the size of several football fields.",
          "Bell Submunitions: Small cylindrical metal bomblets equipped with a nylon ribbon stabilizer. Frequently snag in tree branches, rooftops, or gutters.",
          "High Dud Rate: Up to 20-30% fail to detonate on initial impact due to soft soil or snow. The fuse remains armed and hair-trigger sensitive to footsteps, minor vibration, or direct sunlight heating.",
        ],
      ],
      [
        "Safe Transit in Suspected Mine Areas",
        [
          "Stay strictly on hard asphalt or heavily compacted heavy-vehicle tracks. Never step onto unpaved shoulders, grassy medians, or fresh dirt.",
          "Walk in single file, stepping strictly into the leader's exact footsteps with 10-15 meters separation between individuals.",
          "Visually sweep the path 3 to 5 meters ahead. Any piece of plastic, shiny wire, or protruding ribbon is grounds for immediate halt.",
          "In winter, snow blankets mines completely: departing established trails is suicidal.",
        ],
      ],
      [
        "If Trapped in an Unmarked Minefield",
        [
          "Freeze in place immediately. Do not panic and do not run.",
          "Warn companions loudly: 'HALT! MINES! DO NOT MOVE!'.",
          "Carefully rotate 180 degrees in place and slowly backtrack strictly in your exact entry footprints.",
        ],
      ],
    ],
  }),

  card({
    id: "en-drones-fpv-defense",
    title: "FPV Kamikaze Drone Evasion & Attack Survival Tactics",
    shelf: "voina",
    kind: "alarm",
    lang: "en",
    lead: "FPV attack drones travel at 120-150 km/h with 2 to 6 seconds reaction time. How to identify inbound threats, break targeting lock, and survive in the open.",
    keys: ["drones", "FPV", "kamikaze", "UAV", "drone evasion", "quadcopter", "air attack", "shelter"],
    figure: "drone-evasion",
    figureCaption: "Sharp 90-degree lateral evasive sprint breaking an FPV drone's high-speed terminal dive",
    sections: [
      [
        "Inbound FPV Attack Signatures",
        [
          "Acoustic Signature: A piercing, high-pitched turbine-like whine/buzz from high-RPM propellers (resembling an angry dentist drill or angle grinder). In a dive, the pitch escalates sharply.",
          "Speed: Terminal attack velocity reaches 30 to 45 m/s (up to 150 km/h). From hearing close-range whine to detonation is only 2 to 5 seconds.",
          "Payload: RPG-7 shaped-charge warhead (PG-7V) capable of piercing armor and concrete, or thermobaric charges, or fragmentation canisters with 1000+ ball bearings.",
        ],
      ],
      [
        "Fatal Mistakes During an Attack",
        [
          "DO NOT SPRINT IN A STRAIGHT LINE: Drones are 5 times faster than any human. A person running down a road is an effortless target in the pilot's FPV goggles.",
          "DO NOT SEEK SHELTER IN CIVILIAN VEHICLES: Shaped-charge munitions cut through standard cars effortlessly, igniting fuel and spraying lethal shrapnel.",
          "DO NOT TRY TO SHOOT IT DOWN WITH HANDGUNS: Hitting a 140 km/h erratic aerial drone without a 12-gauge shotgun and skeet training is virtually impossible.",
        ],
      ],
      [
        "Action Protocol: Evasive Maneuver",
        [
          "1. CONSTANT AUDIO MONITORING: In conflict zones, never wear headphones, pull off hoods, and turn off radios in vehicles.",
          "2. PINPOINT VECTOR: Determine which sky quadrant the rising drone pitch is descending from.",
          "3. EXPLOIT KINEMATIC INERTIA: At 130+ km/h, an FPV drone possesses massive kinetic inertia. The pilot operates through a fixed narrow-angle camera and cannot make instant lateral corrections.",
          "4. SHARP 90-DEGREE LATERAL DASH: 1 to 2 seconds before anticipated impact, make a violent sprint perpendicular to the drone's flight path behind a massive barrier (thick tree trunk, concrete pillar, brick wall corner, roadway culvert).",
          "5. PRONE POSITION IN COVER: If no solid structure exists, dive into a deep roadside ditch or crater. Lie FEET TOWARD BLAST, elbows tucked against ribs, hands shielding neck and head, mouth open, ankles crossed.",
        ],
      ],
      [
        "Vehicle Travel Protocols",
        [
          "Dedicated Air Observer: One passenger must maintain continuous 360-degree visual and audio sky watch through rolled-down windows.",
          "Upon Detection: Immediately pull off the road beneath heavy tree canopy or an overpass. If attacked, brake violently or swerve sharply, and evacuate into the opposite ditch.",
        ],
      ],
    ],
  }),

  card({
    id: "en-drones-thermal-camouflage",
    title: "Thermal Drone Evasion & Infrared Camouflage Engineering",
    shelf: "voina",
    kind: "guide",
    lang: "en",
    lead: "Thermal imaging cameras detect temperature differential between the human body and cold surroundings. Proven techniques for infrared signature masking.",
    keys: ["thermal camera", "infrared", "camouflage", "drones", "space blanket", "FLIR", "night drops"],
    sections: [
      [
        "How Thermal Drone Optics Work",
        [
          "FLIR optics register long-wave infrared radiation (8-14 µm). They do not see through solid brick or earth, but detect the stark thermal contrast of human skin (~36.6 °C) against cold ambient ground (-10 to +15 °C).",
          "This heat bloom is visible even through thin tree canopies and tall grass whenever an optical line-of-sight exists.",
        ],
      ],
      [
        "The Foil Space Blanket Myth",
        [
          "CRITICAL ERROR: Wrapping a foil emergency blanket directly over your body and walking. Within 2 to 4 minutes, conductive body heat warms the thin Mylar, turning it into a massive blazing beacon on thermal displays!",
          "SECOND ERROR: Foil reflects whatever it faces. If tilted vertically, it reflects warm ground heat, producing unnatural geometric thermal contrast against surroundings.",
        ],
      ],
      [
        "Proper Infrared Standoff Shielding",
        [
          "1. AIR GAP IS ESSENTIAL: Always maintain an air gap of at least 15-30 cm between your body and the reflective shield. Trapped air is the supreme thermal insulator.",
          "2. MULTI-LAYER PONCHOS: Legitimate anti-thermal cloaks employ 3 layers: internal closed-cell insulation foam, metallized heat-reflective barrier, and external ventilated camouflage fabric.",
          "3. RIGID OVERHEAD SHIELDS: Corrugated roofing, plywood, heavy tarps, or 15+ cm of earth over foxholes completely block direct infrared line-of-sight.",
          "4. SLANTED CANOPIES: Pitch overhead tarps at a 30-45 degree angle. The drone's sensor will see a specular mirror reflection of the sub-zero sky (-40 °C), blending seamlessly into ambient background noise.",
        ],
      ],
      [
        "Weather as Natural Shielding",
        [
          "Fog & Rain: Microscopic water droplets absorb and scatter infrared wavelengths heavily, reducing thermal detection range by 70-80%.",
          "Thermal Crossover: At dawn and dusk, when environmental ground temperature matches human surface temperature, thermal cameras experience minimum target contrast.",
        ],
      ],
    ],
  }),

  card({
    id: "en-drone-detection-and-nets",
    title: "Drone Frequency Detection & Anti-Drone Standoff Netting",
    shelf: "voina",
    kind: "guide",
    lang: "en",
    lead: "Monitoring drone control and video frequency bands, and defensive engineering: standoff netting, blast deflectors, and L-shaped shelter entries.",
    keys: ["drone detection", "RF frequencies", "anti-drone nets", "bunker", "standoff", "EW", "counter-UAS"],
    figure: "trench-netting",
    figureCaption: "Standoff anti-drone net rigged 1.5-2m above trench and L-shaped anti-intrusion portal",
    sections: [
      [
        "Drone RF Signal Bands",
        [
          "Analog Video (FPV): Broadcasts in the 5.6-5.9 GHz band (channel groups A, B, E, F, R) with transmitter power from 800 mW to 2.5 W.",
          "Command & Control (C2): ELRS and TBS Crossfire protocols typically transmit on 868 MHz, 915 MHz, and 2.4 GHz.",
          "Commercial Drones (DJI, Autel): OcuSync protocols operating on frequency-hopping 2.4 GHz and 5.8 GHz bands.",
          "Portable RF Detectors: Spectrum analyzers sweep bands and alert personnel 1-2 km prior to drone arrival, identifying operational frequencies.",
        ],
      ],
      [
        "Anti-Drone Standoff Netting (Trench & Vehicle)",
        [
          "Net Specifications: Heavy nylon fishing twine (1.5-2.5 mm thickness) with 25-40 mm mesh size, or wire chain-link netting.",
          "Standoff Clearance: Suspended on timber poles 1.5 to 2 meters ABOVE trench openings or vehicle hulls.",
          "Operational Effect: The flexible netting tangles drone propellers, halting motors without striking hard fuse contact horns. If detonation occurs, the shaped charge detonates harmlessly in open air, dissipating blast pressure.",
        ],
      ],
      [
        "L-Shaped and T-Shaped Shelter Entrances",
        [
          "Straight entryway stairs are deathtraps: high-speed FPV drones fly directly into subterranean chambers.",
          "Mandatory 90-degree entrance baffle (L-shaped airlock): A drone cannot physically execute high-speed right-angle corners in confined stairwells and slams harmlessly into reinforced earth walls.",
          "Suspended heavy rubber flaps or chain curtains at thresholds provide physical deflection.",
        ],
      ],
    ],
  }),

  card({
    id: "en-artillery-shelling-survival",
    title: "Artillery, Mortar & Rocket Shelling Survival Protocols",
    shelf: "voina",
    kind: "alarm",
    lang: "en",
    sensitive: "med",
    lead: "Auditory incoming projectile signatures, blast wave mechanics, ear and lung barotrauma prevention, and safe vs lethal shelters.",
    keys: ["artillery", "shelling", "mortar", "rockets", "blast wave", "shrapnel", "bunker", "barotrauma"],
    sections: [
      [
        "Identifying Inbound Ordnance by Sound",
        [
          "Mortars (82mm & 120mm): Distinctive rustling, hiss, or fluttering whistle immediately prior to impact. Time from sound to explosion: 2 to 5 seconds. React instantly!",
          "Tube Artillery (122mm, 152mm, 155mm howitzers): Distant dull 'thump' of firing, followed by an escalating heavy freight-train rumble. Flight time: 10 to 20 seconds.",
          "MLRS (Grad, Uragan, Smerch): Screaming roar of rocket booster packs. Smoke trails visible on horizon. Flight time at medium range: 20 to 40 seconds.",
        ],
      ],
      [
        "The Immediate Prone Rule",
        [
          "Hearing whistle or blast — DIVE FLAT IMMEDIATELY WHERE YOU STAND. Do not look around or hesitate.",
          "Shrapnel disperses in an upward-expanding cone. An upright person is vulnerable at 100-150 meters; a person pressed flat against earth frequently survives within 5-10 meters of the crater.",
          "Utilize micro-terrain: roadside ditches, curbs, drainage pipes, furrows, or fresh bomb craters (lightning rarely strikes the exact crater twice).",
        ],
      ],
      [
        "Optimal Prone Body Mechanics",
        [
          "Lie face down, feet pointed toward blast with ankles crossed (shoe soles and leg musculature shield vital pelvic organs).",
          "Cup hands over ears with elbows pinned tightly against ribs.",
          "KEEP MOUTH SLIGHTLY OPEN: The shockwave creates extreme barometric differential. An open mouth equalizes pressure across eustachian tubes, preventing ruptured eardrums and cerebral hemorrhage.",
          "Elevate chest and abdomen slightly off the bare dirt: High-amplitude ground shockwave transmission can rupture spleen, liver, and lungs if pressed hard against soil.",
        ],
      ],
      [
        "Shelter Selection: Safe vs Deathtraps",
        [
          "LETHAL: Glass storefronts and modern curtain-wall facades (flying glass causes 70% of urban trauma); breezeways and archways (wind-tunnel effect doubles blast overpressure); passenger cars; cinder-block walls (shatter into thousands of lethal missiles).",
          "SECURE: Deep basements of reinforced concrete buildings, subway stations, underground pedestrian tunnels, deep slit trenches with 3-layer timber overheads and 1m earth cap.",
          "Two-Exit Rule: Never shelter in a basement with only one exit. Collapse of the stairwell traps occupants beneath rubble or asphyxiates them from post-blast structural fires.",
        ],
      ],
    ],
  }),

  card({
    id: "en-tactical-urban-movement",
    title: "Urban Conflict Transit, RF Surveillance & Blackout Protocols",
    shelf: "voina",
    kind: "guide",
    lang: "en",
    lead: "Modern urban warfare lessons (ISW, MWI): safe traversal vectors, mobile phone RF triangulation, and strict light discipline.",
    keys: ["urban combat", "blackout", "smartphones", "RF tracking", "gray zone", "sprints", "snipers"],
    sections: [
      [
        "Movement Rules in Gray Zones",
        [
          "Avoid Open Ground: Never cross plazas diagonally or walk down center avenues. These are pre-sighted kill zones for snipers and surveillance drones.",
          "Hug Solid Walls: Move along the shadowed side of buildings close to foundation plinths, blending into wall textures.",
          "3-Second Bounding Sprints: Maximum exposure time between cover is 3 to 4 seconds. Mentally count: 'I see cover — I'm up — one, two, three — I'm down'. Snipers require 3+ seconds to track and fire accurately.",
          "Corner Clearance: Never peek around building corners at eye height. Inspect from prone ground level, or using a pocket mirror.",
        ],
      ],
      [
        "Mobile Phones and Electronic Warfare (EW)",
        [
          "WHY PHONES MUST REMAIN OFF: Modern EW systems (e.g. Leer-3, IMSI-catchers, automated COMINT drones) mimic cellular towers, harvesting device IDs across entire sectors.",
          "Device Clustering: Sudden activation of 3-5 cellular devices in an otherwise dormant block triggers automatic artillery or glide-bomb targeting against those coordinates.",
          "Airplane Mode is NOT Safe: Baseband modems continue intermittent background beaconing. The only reliable countermeasure is total power off, battery extraction, or storage in a Faraday sleeve fabricated from 4 layers of heavy aluminum foil.",
        ],
      ],
      [
        "Blackout Discipline (Light Discipline)",
        [
          "A striking match or lighter flame is detectable by night-vision optics and thermal drones up to 1.5-2 km away.",
          "Smartphone screens at standard brightness illuminate faces and emit noticeable visible and IR signatures.",
          "Indoor Windows: Hang thick blankets, plywood, or foil insulation. Zero light bleed is permissible.",
          "Flashlights: Use only ultra-low tactical red illumination pointed straight at your toes under cupped hands.",
        ],
      ],
    ],
  }),
];
