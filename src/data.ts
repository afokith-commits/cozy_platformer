/**
 * Game Data Definitions (Items, Badges, Dialogues, Levels)
 */

import { DialogueTree, ItemsCatalog, LevelData } from "./types.js";

export const ITEMS_DATA: ItemsCatalog = {
  abilities: {
    feather_badge: {
      name: "Feather Badge",
      price: 8,
      description: "Grants a graceful mid-air Double Jump! Great for reaching high treetops and secret ledges.",
      hint: "Available in Pip's Cozy Curiosity Shop for 8 Gems."
    },
    breeze_dash: {
      name: "Breeze Dash",
      price: 12,
      description: "Press [Shift] or [X] to dart forward on a gentle gust of wind across wide gaps.",
      hint: "Available in Pip's Cozy Curiosity Shop for 12 Gems."
    },
    clover_boots: {
      name: "Clover Boots",
      price: 10,
      description: "Increases walking speed and acceleration by ~30% for breezy meadow sprints.",
      hint: "Available in Pip's Cozy Curiosity Shop for 10 Gems."
    },
    magnet_charm: {
      name: "Magnet Charm",
      price: 14,
      description: "Softly pulls nearby gems right into your satchel as you hop past.",
      hint: "Available in Pip's Shop—or chat with Luma in the Sunken Ruins!"
    },
    glide_leaf: {
      name: "Leaf Glider",
      price: 0,
      description: "Hold [Space] while falling to float gently on a maple breeze across high cliffs.",
      hint: "Gifted by Sol the Skyweaver atop the Sunlit Spire."
    },
    moss_claws: {
      name: "Moss Claws",
      price: 12,
      description: "Cling to steep walls to slide slowly and kick off into crisp Wall-Jumps!",
      hint: "Available in Pip's Cozy Curiosity Shop for 12 Gems."
    },
    acorn_slam: {
      name: "Acorn Slam",
      price: 14,
      description: "Press [C] or [Down + Dash] mid-air to smash Cracked Boulders and Super-Bounce off mushrooms!",
      hint: "Available in Pip's Cozy Curiosity Shop for 14 Gems."
    },
    bubble_shield: {
      name: "Dewdrop Bubble",
      price: 16,
      description: "Surrounds you in a protective bubble that pops you safely out of 1 hazard or critter hit.",
      hint: "Available in Pip's Shop—or aid Pebble the Mole in Crystal Hollow!"
    },
    trial_wing: {
      name: "Sunburst Wings",
      price: 0,
      description: "Trial Reward: Grants an extra mid-air Jump (stacks with Feather Badge for Triple Jump!).",
      hint: "Complete all 5 Starlight Time Trials across the Valley."
    }
  },
  trails: {
    sparkle_trail: {
      name: "Sparkle Trail",
      price: 6,
      description: "Cosmetic Badge: Leaves a warm trail of golden sparkles behind your footsteps.",
      hint: "Available in Pip's Cozy Curiosity Shop for 6 Gems."
    },
    petal_trail: {
      name: "Blossom Petal Trail",
      price: 6,
      description: "Cosmetic Badge: Scatters soft pink & sage meadow petals as you leap.",
      hint: "Available in Pip's Cozy Curiosity Shop for 6 Gems."
    },
    starlight_trail: {
      name: "Starlight Trail",
      price: 8,
      description: "Cosmetic Badge: Shimmering twilight dust trails behind you in mid-air.",
      hint: "Available in Pip's Shop—or help Bramble the Fox in Canopy Cliffs!"
    },
    festival_crown: {
      name: "Sprout Festival Halo",
      price: 0,
      description: "Campaign Reward: A radiant golden festival aura celebrating the unity of all four shrines!",
      hint: "Awarded by Grandma Willow when all 4 Shrines are attuned."
    }
  },
  trinkets: {
    dewdrop_bell: {
      name: "Dewdrop Bell",
      color: [128, 224, 226],
      description: "A tiny glass bell from the Meadow Overlook that rings softly whenever morning mist rolls in.",
      hint: "Hidden high above Meadow Hub—try bouncing up the mossy platforms!"
    },
    mossy_compass: {
      name: "Mossy Compass",
      color: [146, 206, 121],
      description: "An old brass pocket compass overgrown with clover. Its needle always points toward warm tea.",
      hint: "Tucked on the highest branch of Canopy Cliffs."
    },
    starlight_lantern: {
      name: "Starlight Lantern",
      color: [255, 224, 122],
      description: "A palm-sized lantern humming with bottled twilight from the upper Sunken Ruins.",
      hint: "Resting on an upper stone arch in the Sunken Ruins."
    },
    fossil_acorn: {
      name: "Amber Acorn",
      color: [229, 142, 92],
      description: "A prehistoric golden acorn preserved in warm amber, prized by forest cartographers.",
      hint: "Across the quiet subterranean pool in the Sunken Ruins."
    },
    sunstone_prism: {
      name: "Sunstone Prism",
      color: [255, 198, 94],
      description: "A warm golden crystal that splits afternoon sunbeams into cozy rainbows.",
      hint: "Perched on the western sky-arch of the Sunlit Spire."
    },
    skyward_bell: {
      name: "Skyward Chime",
      color: [176, 232, 255],
      description: "A wind-chime woven by Sol from cloud-silk and brass, singing softly in high breezes.",
      hint: "Tucked on the eastern cloud terrace of the Sunlit Spire."
    },
    moonstone_geode: {
      name: "Moonstone Geode",
      color: [168, 224, 255],
      description: "A glowing azure crystal heart humming softly in the upper ledges of Crystal Hollow.",
      hint: "Bounce up the western wind updraft of Crystal Hollow."
    },
    crystal_flute: {
      name: "Whispering Flute",
      color: [216, 178, 255],
      description: "A carved amethyst pan-flute that echoes gently through deep underground arches.",
      hint: "Ride the eastern breeze updraft to the summit of Crystal Hollow."
    }
  }
};

export const DIALOGUES_DATA: Record<string, DialogueTree> = {
  grandma_willow: {
    start: "greeting",
    entry_rules: [
      {
        condition: { shrine_count_gte: 5, trial_count_gte: 5, not_flag: "festival_complete" },
        node: "festival_finale"
      },
      {
        condition: { trinket_count_gte: 8, not_flag: "willow_all_trinkets" },
        node: "all_trinkets"
      },
      {
        condition: { flag: "festival_complete" },
        node: "post_festival"
      },
      {
        condition: { flag: "willow_gift" },
        node: "returning"
      }
    ],
    nodes: {
      greeting: {
        text: "Good day, little sprout! Isn't the meadow air sweet today? Press [Tab] anytime to peek in your backpack, or [M] to view the shrine map.",
        choices: [
          { label: "Ask about Gems", next: "about_gems" },
          { label: "I'm ready to explore!", next: "gift" }
        ]
      },
      about_gems: {
        text: "Shiny teal and golden gems dot the cliffs and ruins. Pip over by the signpost trades them for handy badges—like a Feather Badge for Double Jumping!",
        choices: [{ label: "Thanks, Grandma!", next: "gift" }]
      },
      gift: {
        text: "Here—take a few pocket gems from my tea jar so you can try out Pip's shop right away. Stay cozy out there!",
        effects: [
          { type: "set_flag", flag: "willow_gift", value: true },
          { type: "give_gems", amount: 5 },
          { type: "save" }
        ],
        choices: [{ label: "Thank you!", close: true }]
      },
      returning: {
        text: "Take your time hopping between the meadow, canopy, and ruins. There's no rush at all—if you slip into a stream, you'll puff right back onto safe ground.",
        choices: [
          { label: "Any tips on Shrines?", next: "shrines" },
          { label: "See you soon!", close: true }
        ]
      },
      shrines: {
        text: "Each region holds a stone lantern Shrine. Attune it once with [E], and you can fast-travel right back from your [M] Map anytime!",
        choices: [{ label: "Got it!", close: true }]
      },
      all_trinkets: {
        text: "My goodness—you found all eight lost trinkets across the valley! You have the heart of a true cozy explorer. Take these celebratory Star Gems!",
        effects: [
          { type: "set_flag", flag: "willow_all_trinkets", value: true },
          { type: "give_gems", amount: 15 },
          { type: "save" }
        ],
        choices: [{ label: "Hooray!", close: true }]
      },
      festival_finale: {
        text: "Look at the valley—all shrines glowing and all five Starlight Time Trials conquered! The Festival of Sprouts has begun! Wear this Sunburst Wing mastery badge!",
        effects: [
          { type: "set_flag", flag: "festival_complete", value: true },
          { type: "give_badge", badge_id: "trial_wing", category: "ability" },
          { type: "give_badge", badge_id: "festival_crown", category: "trail" },
          { type: "give_gems", amount: 30 },
          { type: "save" }
        ],
        choices: [{ label: "Celebrate!", close: true }]
      },
      post_festival: {
        text: "The lanterns are warm and the whole valley is at peace. Hop around anytime, check your [J] Journal, or hunt down any leftover trinkets!",
        choices: [{ label: "Stay cozy!", close: true }]
      }
    }
  },
  pip_merchant: {
    start: "welcome",
    nodes: {
      welcome: {
        text: "Ribbit! Welcome to Pip's Traveling Satchel! I've got Feather Badges, Moss Claws, Acorn Slams, and sparkly trails for fair gem prices!",
        choices: [
          { label: "Browse Shop", open_shop: true },
          { label: "Just chatting", next: "chat" },
          { label: "Maybe later", close: true }
        ]
      },
      chat: {
        text: "Everything I sell snaps right onto your cloak as a Badge. You can toggle abilities or swap cosmetic trails anytime in your [Tab] Backpack!",
        choices: [
          { label: "Open Shop", open_shop: true },
          { label: "Thanks, Pip!", close: true }
        ]
      }
    }
  },
  bramble_fox: {
    start: "intro",
    entry_rules: [
      {
        condition: { trinket_count_gte: 2, not_flag: "bramble_reward" },
        node: "cartographer_gift"
      },
      {
        condition: { flag: "bramble_reward" },
        node: "post_gift"
      }
    ],
    nodes: {
      intro: {
        text: "Ahoy, fellow wanderer! I'm sketching the Canopy Cliffs. Don't miss the Canopy Shrine up on the middle bough—it'll link straight to your [M] Map!",
        choices: [
          { label: "Any secrets nearby?", next: "secret" },
          { label: "Good luck mapping!", close: true }
        ]
      },
      secret: {
        text: "Rumour says a Mossy Compass sits atop the highest eastern branch. A bouncy mushroom and a Feather Badge will get you right up there!",
        choices: [{ label: "I'll look for it!", close: true }]
      },
      cartographer_gift: {
        text: "Whoa—you've already tracked down two rare trinkets! As one cartographer to another, please take my spare Starlight Trail badge!",
        effects: [
          { type: "set_flag", flag: "bramble_reward", value: true },
          { type: "give_badge", badge_id: "starlight_trail", category: "trail" },
          { type: "save" }
        ],
        choices: [{ label: "Ooh, shiny!", close: true }]
      },
      post_gift: {
        text: "The twilight breeze feels amazing up here, doesn't it? Keep charting every nook!",
        choices: [{ label: "Will do!", close: true }]
      }
    }
  },
  luma_spirit: {
    start: "whisper",
    entry_rules: [
      {
        condition: { has_trinket: "starlight_lantern", not_flag: "luma_charm" },
        node: "lantern_joy"
      },
      {
        condition: { flag: "luma_charm" },
        node: "peaceful"
      }
    ],
    nodes: {
      whisper: {
        text: "Hush, warm little sprout... The Sunken Ruins glow brightest when travelers carry our lost Starlight Lantern. Have you spotted it high above?",
        choices: [
          { label: "Where is it?", next: "hint" },
          { label: "I'll keep looking", close: true }
        ]
      },
      hint: {
        text: "Follow the glowing mushroom pads up to the western stone arch. And don't forget to attune the Ruins Shrine right beside me!",
        choices: [{ label: "Thank you, Luma", close: true }]
      },
      lantern_joy: {
        text: "Oh! You found the Starlight Lantern! Its gentle hum warms the whole cavern. Let me bless your satchel with a Magnet Charm!",
        effects: [
          { type: "set_flag", flag: "luma_charm", value: true },
          { type: "give_badge", badge_id: "magnet_charm", category: "ability" },
          { type: "save" }
        ],
        choices: [{ label: "Thank you so much!", close: true }]
      },
      peaceful: {
        text: "May the fireflies always light your ledges, little traveler.",
        choices: [{ label: "Stay cozy, Luma", close: true }]
      }
    }
  },
  sol_owl: {
    start: "welcome",
    entry_rules: [
      {
        condition: { has_trinket: "sunstone_prism", not_flag: "sol_prism_seen" },
        node: "prism_praise"
      },
      {
        condition: { flag: "sol_glider" },
        node: "breezy"
      }
    ],
    nodes: {
      welcome: {
        text: "Hoo-hoo! Welcome above the clouds, little sprout! I am Sol the Skyweaver. Up here, the golden wind carries travelers gently—take this Leaf Glider!",
        effects: [
          { type: "set_flag", flag: "sol_glider", value: true },
          { type: "give_badge", badge_id: "glide_leaf", category: "ability" },
          { type: "save" }
        ],
        choices: [
          { label: "How do I use it?", next: "how_to" },
          { label: "Thank you, Sol!", close: true }
        ]
      },
      how_to: {
        text: "Hold [Space] while falling to catch the updraft and float gently! Use it to reach the Sunstone Prism on the western arch and the Spire Shrine.",
        choices: [{ label: "I'll try it!", close: true }]
      },
      prism_praise: {
        text: "Aha! You recovered the Sunstone Prism! Its warm light completes the Spire's song. Take these Star Gems for your satchel!",
        effects: [
          { type: "set_flag", flag: "sol_prism_seen", value: true },
          { type: "give_gems", amount: 10 },
          { type: "save" }
        ],
        choices: [{ label: "Thank you, Sol!", close: true }]
      },
      breezy: {
        text: "Hold [Space] in mid-air to glide on the golden breeze. Once all shrines glow and trials are conquered, Grandma Willow will host the Festival!",
        choices: [{ label: "See you below!", close: true }]
      }
    }
  },
  pebble_mole: {
    start: "hello",
    entry_rules: [
      {
        condition: { has_trinket: "moonstone_geode", not_flag: "pebble_bubble" },
        node: "geode_gift"
      },
      {
        condition: { flag: "pebble_bubble" },
        node: "happy"
      }
    ],
    nodes: {
      hello: {
        text: "Sniff-sniff! Welcome to Crystal Hollow! Cracked boulders hide secret gem caches—smash them with Breeze Dash or Acorn Slam! Have you spotted the Moonstone Geode up top?",
        choices: [{ label: "I'll keep digging!", close: true }]
      },
      geode_gift: {
        text: "Whoa—you found the Moonstone Geode! Its cool spring magic belongs with a brave explorer. Take this Dewdrop Bubble badge!",
        effects: [
          { type: "set_flag", flag: "pebble_bubble", value: true },
          { type: "give_badge", badge_id: "bubble_shield", category: "ability" },
          { type: "save" }
        ],
        choices: [{ label: "Thank you, Pebble!", close: true }]
      },
      happy: {
        text: "Don't forget to test your jumps on the Crystal Hollow Time Trial totem!",
        choices: [{ label: "On it!", close: true }]
      }
    }
  }
};

export const LEVELS_DATA: Record<string, LevelData> = {
  meadow_hub: {
    id: "meadow_hub",
    name: "Meadow Hub",
    theme: "meadow",
    ambient_type: "fireflies",
    grid: [
      "#############################################",
      "#                                           #",
      "#                                           #",
      "#                                           #",
      "#                                           #",
      "#            *                              #",
      "#          #####                            #",
      "#                                           #",
      "#                ===    ===                 #",
      "#                                           #",
      "#  ===                   ===       =======  #",
      "#       ===                                 #",
      "#           G   G           ^               #",
      "#          =======         ===   G    G     #",
      "#   P             G     G       ===         #",
      "########################~~~##################",
      "#############################################",
      "#############################################"
    ],
    spawns: {
      start: [4, 14],
      shrine: [7, 14],
      from_canopy: [39, 9],
      from_ruins: [39, 14]
    },
    shrines: [{ shrine_id: "shrine_meadow", name: "Meadow Hearth Shrine", col: 6, row: 14 }],
    npcs: [
      { npc_id: "grandma_willow", name: "Grandma Willow", dialogue_id: "grandma_willow", col: 11, row: 14, style: "willow" },
      { npc_id: "pip_merchant", name: "Pip the Merchant", dialogue_id: "pip_merchant", col: 20, row: 14, style: "frog" }
    ],
    signs: [
      { col: 17, row: 14, text: "Welcome to Meadow Hub! Jump with [Space], talk or enter doors with [E], open Backpack with [Tab], and open Shrine Map with [M]." }
    ],
    portals: [
      { target_level: "canopy_cliffs", target_spawn: "from_meadow", label: "To Canopy Cliffs", col: 40, row: 9 },
      { target_level: "sunken_ruins", target_spawn: "from_meadow", label: "To Sunken Ruins", col: 42, row: 14 }
    ],
    trinkets: [{ trinket_id: "dewdrop_bell", col: 14, row: 5 }],
    platforms: [{ col1: 29, row1: 10, col2: 33, row2: 10, speed: 1.4, tiles: 3 }],
    critters: [{ col: 32, row: 14, minCol: 29, maxCol: 35, style: "beetle" }],
    trial: {
      trial_id: "trial_meadow",
      name: "Meadow Dash",
      col: 8,
      row: 14,
      time_limit: 22,
      rings: [[11, 12], [14, 12], [18, 7], [25, 7], [28, 11], [34, 13]]
    },
    decor: [
      { kind: "tree", col: 2, row: 14 },
      { kind: "flower", col: 9, row: 14 },
      { kind: "lantern", col: 14, row: 14 },
      { kind: "tree", col: 22, row: 14 },
      { kind: "flower", col: 35, row: 14 },
      { kind: "lantern", col: 37, row: 9 }
    ]
  },
  canopy_cliffs: {
    id: "canopy_cliffs",
    name: "Canopy Cliffs",
    theme: "canopy",
    ambient_type: "leaves",
    grid: [
      "##############################################",
      "#                                            #",
      "#                                            #",
      "#                                     *      #",
      "#                                   ######   #",
      "#             G   G                          #",
      "#            === O   O ===              O    #",
      "#      ===                        ===        #",
      "#                     ===                    #",
      "#                  #######                   #",
      "#                     ^                G  G  #",
      "#    ^       G   ===       ^          ###### #",
      "#   ===     ===           ===                #",
      "#     G                             ^        #",
      "#   #####          ===             ===       #",
      "#                                            #",
      "#########~~~############~~~###################",
      "##############################################",
      "##############################################"
    ],
    spawns: {
      start: [3, 15],
      from_meadow: [3, 15],
      shrine: [20, 8],
      from_ruins: [40, 10],
      from_spire: [36, 3]
    },
    shrines: [{ shrine_id: "shrine_canopy", name: "Canopy Bough Shrine", col: 20, row: 8 }],
    npcs: [{ npc_id: "bramble_fox", name: "Bramble the Fox", dialogue_id: "bramble_fox", col: 7, row: 15, style: "fox" }],
    signs: [{ col: 15, row: 15, text: "Bouncy mushrooms launch you high into the treetops! Attune the Canopy Shrine up center to unlock fast travel." }],
    portals: [
      { target_level: "meadow_hub", target_spawn: "from_canopy", label: "Back to Meadow Hub", col: 2, row: 15 },
      { target_level: "sunken_ruins", target_spawn: "from_canopy", label: "Descend to Sunken Ruins", col: 42, row: 10 },
      { target_level: "sunlit_spire", target_spawn: "from_canopy", label: "Ascend to Sunlit Spire", col: 37, row: 3 }
    ],
    trinkets: [{ trinket_id: "mossy_compass", col: 40, row: 3 }],
    platforms: [{ col1: 11, row1: 7, col2: 16, row2: 7, speed: 1.6, tiles: 3 }],
    critters: [{ col: 17, row: 15, minCol: 13, maxCol: 22, style: "beetle" }],
    trial: {
      trial_id: "trial_canopy",
      name: "Canopy Breeze",
      col: 13,
      row: 15,
      time_limit: 26,
      rings: [[5, 10], [8, 6], [13, 6], [20, 7], [28, 10], [35, 10]]
    },
    decor: [
      { kind: "tree", col: 5, row: 15 },
      { kind: "lantern", col: 24, row: 8 },
      { kind: "flower", col: 30, row: 15 },
      { kind: "tree", col: 34, row: 15 }
    ]
  },
  sunken_ruins: {
    id: "sunken_ruins",
    name: "Sunken Ruins",
    theme: "ruins",
    ambient_type: "spores",
    grid: [
      "##############################################",
      "#                                            #",
      "#                                            #",
      "#                                            #",
      "#                                            #",
      "#       *                                    #",
      "#     ######                         ######  #",
      "#               ===                          #",
      "#      ===               ===      ===        #",
      "#                                            #",
      "#   ^                                        #",
      "#  ===           G   G               G  G    #",
      "#               =======     ===     ======   #",
      "#     ===                                    #",
      "#                        ^       G           #",
      "#   G    G              ===     ===    *     #",
      "############~~~####~~~#################~~~####",
      "##############################################",
      "##############################################"
    ],
    spawns: {
      start: [3, 15],
      from_meadow: [3, 15],
      shrine: [16, 15],
      from_canopy: [39, 5],
      from_cavern: [33, 15]
    },
    shrines: [{ shrine_id: "shrine_ruins", name: "Twilight Ruins Shrine", col: 16, row: 15 }],
    npcs: [{ npc_id: "luma_spirit", name: "Luma the Spirit", dialogue_id: "luma_spirit", col: 18, row: 15, style: "spirit" }],
    signs: [{ col: 8, row: 15, text: "Ancient twilight arches cradle the valley below. Speak with Luma beside the shrine if you find the Starlight Lantern!" }],
    portals: [
      { target_level: "meadow_hub", target_spawn: "from_ruins", label: "Back to Meadow Hub", col: 2, row: 15 },
      { target_level: "canopy_cliffs", target_spawn: "from_ruins", label: "Up to Canopy Cliffs", col: 41, row: 5 },
      { target_level: "starlight_caverns", target_spawn: "from_ruins", label: "Descend to Crystal Hollow", col: 35, row: 15 }
    ],
    trinkets: [
      { trinket_id: "starlight_lantern", col: 10, row: 5 },
      { trinket_id: "fossil_acorn", col: 37, row: 15 }
    ],
    critters: [{ col: 28, row: 15, minCol: 23, maxCol: 32, style: "crystal" }],
    trial: {
      trial_id: "trial_ruins",
      name: "Twilight Sprint",
      col: 12,
      row: 15,
      time_limit: 26,
      rings: [[4, 9], [8, 7], [16, 11], [25, 13], [30, 11], [37, 11]]
    },
    decor: [
      { kind: "pillar", col: 5, row: 15 },
      { kind: "lantern", col: 10, row: 15 },
      { kind: "pillar", col: 28, row: 15 },
      { kind: "lantern", col: 38, row: 5 }
    ]
  },
  sunlit_spire: {
    id: "sunlit_spire",
    name: "Sunlit Spire",
    theme: "spire",
    ambient_type: "fireflies",
    grid: [
      "##############################################",
      "#                                            #",
      "#                                            #",
      "#     *                                      #",
      "#   ######                  ===              #",
      "#             ===       U               *    #",
      "#                     U U             ###### #",
      "#      ===            U U                    #",
      "#                  #########                 #",
      "#   ^              U                         #",
      "#  ===      ===    U            ===          #",
      "#                     ^                      #",
      "#        G   G       ===    G   G      ^     #",
      "#       =======            =======    ===    #",
      "#                                            #",
      "#   P        ===         ===       #######   #",
      "#########~~~#########~~~##########~~~~~~~~~~~#",
      "##############################################",
      "##############################################"
    ],
    spawns: {
      start: [4, 14],
      from_canopy: [4, 14],
      shrine: [23, 7]
    },
    shrines: [{ shrine_id: "shrine_spire", name: "Spire Summit Shrine", col: 22, row: 7 }],
    npcs: [{ npc_id: "sol_owl", name: "Sol the Skyweaver", dialogue_id: "sol_owl", col: 6, row: 14, style: "owl" }],
    signs: [
      { col: 3, row: 14, text: "Welcome to the Sunlit Spire! Speak with Sol the Skyweaver to receive the Leaf Glider." }
    ],
    portals: [
      { target_level: "canopy_cliffs", target_spawn: "from_spire", label: "Down to Canopy Cliffs", col: 2, row: 15 }
    ],
    trinkets: [
      { trinket_id: "sunstone_prism", col: 7, row: 3 },
      { trinket_id: "skyward_bell", col: 42, row: 5 }
    ],
    platforms: [{ col1: 15, row1: 9, col2: 17, row2: 9, speed: 1.5, tiles: 3 }],
    trial: {
      trial_id: "trial_spire",
      name: "Skyweaver Glide",
      col: 16,
      row: 15,
      time_limit: 28,
      rings: [[10, 12], [4, 8], [8, 6], [16, 4], [23, 5], [30, 3], [41, 4]]
    },
    decor: [
      { kind: "lantern", col: 7, row: 14 },
      { kind: "pillar", col: 20, row: 7 },
      { kind: "lantern", col: 24, row: 7 },
      { kind: "flower", col: 38, row: 14 }
    ]
  },
  starlight_caverns: {
    id: "starlight_caverns",
    name: "Crystal Hollow",
    theme: "cavern",
    ambient_type: "spores",
    grid: [
      "##############################################",
      "#                                            #",
      "#    *                                  *    #",
      "#  #####                              ###### #",
      "#           O          O                     #",
      "#              ---          U                #",
      "#   ^                       U    ===         #",
      "#  ===     ===              U                #",
      "#                  #######  U                #",
      "#   U                       U   ---    G  G  #",
      "#   U     ===               U         ###### #",
      "#   U            O         ===               #",
      "#   U     ---              ^                 #",
      "#   U               ===   ===   ########     #",
      "#                               B  G * #     #",
      "#  P      G    G                B      #     #",
      "#################~~~####~~~###################",
      "##############################################",
      "##############################################"
    ],
    spawns: {
      start: [3, 15],
      from_ruins: [3, 15],
      shrine: [15, 15]
    },
    shrines: [{ shrine_id: "shrine_cavern", name: "Crystal Hollow Shrine", col: 14, row: 15 }],
    npcs: [{ npc_id: "pebble_mole", name: "Pebble the Mole", dialogue_id: "pebble_mole", col: 7, row: 15, style: "mole" }],
    signs: [{ col: 5, row: 15, text: "Crystal Hollow! Smash Cracked Boulders [B] with Dash or [C] Acorn Slam, and glide up glowing Wind Updrafts [U]." }],
    portals: [
      { target_level: "sunken_ruins", target_spawn: "from_cavern", label: "Up to Sunken Ruins", col: 2, row: 15 }
    ],
    trinkets: [
      { trinket_id: "moonstone_geode", col: 5, row: 2 },
      { trinket_id: "crystal_flute", col: 41, row: 2 }
    ],
    platforms: [
      { col1: 18, row1: 14, col2: 24, row2: 14, speed: 1.5, tiles: 3 },
      { col1: 29, row1: 6, col2: 32, row2: 6, speed: 1.7, tiles: 2 }
    ],
    critters: [{ col: 11, row: 15, minCol: 8, maxCol: 13, style: "crystal" }],
    trial: {
      trial_id: "trial_cavern",
      name: "Hollow Ascent",
      col: 10,
      row: 15,
      time_limit: 30,
      rings: [[4, 10], [4, 5], [11, 3], [23, 3], [28, 6], [34, 5], [40, 2]]
    },
    decor: [
      { kind: "lantern", col: 12, row: 15 },
      { kind: "pillar", col: 20, row: 7 },
      { kind: "lantern", col: 38, row: 15 }
    ]
  }
};
