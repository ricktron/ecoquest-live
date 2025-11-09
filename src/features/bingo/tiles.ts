import { BingoBoard } from "./types";

export const BINGO_BOARD_THIS_WEEK: BingoBoard = {
  id: "week-one-default",
  title: "EcoQuest Live – Weekly Bingo",
  weekHint: "Costa Rica field week",
  tiles: [
    // Row 1
    {
      position: 0,
      slug: "any-mammal",
      label: "Any Mammal",
      emoji: "🐾",
      ancestors: ["Mammalia"],
      details: {
        whatCounts: "Any observation in Mammalia.",
        examples: ["Mantled Howler", "White-nosed Coati", "White-faced Capuchin", "Agouti", "Any bat"],
        photoTip: "Capture ears, tail, and side profile; zoom instead of getting closer.",
        safety: "Never approach or feed wildlife."
      }
    },
    {
      position: 1,
      slug: "wading-bird",
      label: "Wading Bird",
      emoji: "🪶",
      ancestors: ["Ardeidae", "Threskiornithidae", "Ciconiidae"],
      details: {
        whatCounts: "Herons, egrets, ibises, or storks.",
        examples: ["Great Egret", "Snowy Egret", "Green Heron", "White Ibis", "Wood Stork"],
        photoTip: "Include bill, legs, and overall posture; one close head shot helps."
      }
    },
    {
      position: 2,
      slug: "any-frog",
      label: "Any Frog",
      emoji: "🐸",
      ancestors: ["Anura"],
      details: {
        whatCounts: "Any frog (order Anura).",
        examples: ["Red-eyed Tree Frog", "Smoky Jungle Frog", "Glass Frog"],
        photoTip: "Side profile of head and flanks; avoid harsh flashlight glare at night."
      }
    },
    {
      position: 3,
      slug: "lep-butterfly-moth",
      label: "Butterfly or Moth",
      emoji: "🦋",
      ancestors: ["Lepidoptera"],
      details: {
        whatCounts: "Any butterfly or moth.",
        examples: ["Blue Morpho", "Owl Butterfly", "Heliconius longwings"],
        photoTip: "Wings flat if possible; include dorsal and ventral patterns."
      }
    },
    {
      position: 4,
      slug: "leafcutter-ant",
      label: "Leafcutter Ant",
      emoji: "🐜",
      ancestors: ["Atta", "Acromyrmex"],
      details: {
        whatCounts: "Leafcutter columns (Atta or Acromyrmex).",
        examples: ["Atta cephalotes (typical in CR)"],
        photoTip: "Show the trail and a carrier ant with a leaf fragment."
      }
    },

    // Row 2
    {
      position: 5,
      slug: "lizard-iguana",
      label: "Lizard or Iguana",
      emoji: "🦎",
      ancestors: ["Dactyloidae", "Iguanidae", "Scincidae"],
      details: {
        whatCounts: "Anoles, basilisks, iguanas, skinks.",
        examples: ["Green Iguana", "Basilisk", "Anole (Norops/Anolis)"],
        photoTip: "Profile with full tail; capture crest or dewlap if visible."
      }
    },
    {
      position: 6,
      slug: "kingfisher",
      label: "Kingfisher",
      emoji: "🐦",
      ancestors: ["Alcedinidae"],
      details: {
        whatCounts: "Any kingfisher.",
        examples: ["Ringed Kingfisher", "Amazon Kingfisher", "Green Kingfisher"],
        photoTip: "Include bill shape and chest band; perch near water tells a lot."
      }
    },
    {
      position: 7,
      slug: "orchid",
      label: "Orchid",
      emoji: "🌸",
      ancestors: ["Orchidaceae"],
      details: {
        whatCounts: "Any orchid (wild or cultivated seen in the field).",
        examples: ["Epiphytic orchids on branches", "Ground orchids"],
        photoTip: "Macro of the flower face; add a second shot showing leaves and growth habit."
      }
    },
    {
      position: 8,
      slug: "odonata",
      label: "Dragonfly or Damselfly",
      emoji: "🪰",
      ancestors: ["Odonata"],
      details: {
        whatCounts: "Any dragonfly or damselfly.",
        examples: ["Skimmers", "Darters", "Bluets"],
        photoTip: "Side shot showing abdomen and wing venation; steady the camera."
      }
    },
    {
      position: 9,
      slug: "any-spider",
      label: "Any Spider",
      emoji: "🕷️",
      ancestors: ["Araneae"],
      details: {
        whatCounts: "Any spider.",
        examples: ["Golden Silk Orb-weaver", "Jumping Spiders", "Garden Spiders"],
        photoTip: "Eyes and dorsal pattern help; include web style if present."
      }
    },

    // Row 3
    {
      position: 10,
      slug: "toucan-aracari",
      label: "Toucan or Aracari",
      emoji: "🦚",
      ancestors: ["Ramphastidae"],
      details: {
        whatCounts: "Any toucan or aracari.",
        examples: ["Keel-billed Toucan", "Yellow-throated Toucan", "Collared Aracari"],
        photoTip: "Bill profile and throat color; perch context helps ID."
      }
    },
    {
      position: 11,
      slug: "bromeliad",
      label: "Bromeliad",
      emoji: "🌿",
      ancestors: ["Bromeliaceae"],
      details: {
        whatCounts: "Any bromeliad (tank or non-tank).",
        examples: ["Tillandsia", "Guzmania", "Vriesea"],
        photoTip: "Show rosette and tank; include how it attaches to its host."
      }
    },
    {
      position: 12,
      slug: "free",
      label: "FREE",
      emoji: "🆓",
      ancestors: [],
      details: {
        whatCounts: "Free space.",
        examples: [],
        photoTip: ""
      }
    },
    {
      position: 13,
      slug: "snail-slug",
      label: "Snail or Slug",
      emoji: "🐌",
      ancestors: ["Gastropoda"],
      details: {
        whatCounts: "Any land snail or slug.",
        examples: ["Tree snails", "Leaf-litter snails"],
        photoTip: "Macro of shell shape or mantle; include habitat context."
      }
    },
    {
      position: 14,
      slug: "any-fish",
      label: "Any Fish",
      emoji: "🐠",
      ancestors: ["Actinopterygii"],
      details: {
        whatCounts: "Any ray-finned fish.",
        examples: ["Cichlids", "Tetras", "Surface fish in canals"],
        photoTip: "Side profile; avoid surface glare by angling the camera."
      }
    },

    // Row 4
    {
      position: 15,
      slug: "parrot-any",
      label: "Parrot (any)",
      emoji: "🦜",
      ancestors: ["Psittaciformes"],
      details: {
        whatCounts: "Parrots, parakeets, macaws.",
        examples: ["Scarlet Macaw", "Red-lored Amazon", "Mealy Amazon", "Orange-chinned Parakeet"],
        photoTip: "Face and beak; flock shots help with behavior notes."
      }
    },
    {
      position: 16,
      slug: "bird-of-prey",
      label: "Bird of Prey",
      emoji: "🦅",
      ancestors: ["Accipitriformes", "Falconiformes", "Strigiformes"],
      details: {
        whatCounts: "Hawks, falcons, owls, kites.",
        examples: ["Roadside Hawk", "Gray Hawk", "Crested Caracara", "Spectacled Owl"],
        photoTip: "Silhouette, bill, and wing shape; note time of day for owls."
      }
    },
    {
      position: 17,
      slug: "lichen",
      label: "Lichen",
      emoji: "🪨",
      ancestors: ["Lichens"],
      details: {
        whatCounts: "Any lichen on bark, rock, or leaves.",
        examples: ["Foliose lichens", "Fruticose lichens"],
        photoTip: "Macro of texture; include the substrate in a second shot."
      }
    },
    {
      position: 18,
      slug: "palm-any",
      label: "Palm (any)",
      emoji: "🌴",
      ancestors: ["Arecaceae"],
      details: {
        whatCounts: "Any palm.",
        examples: ["Coconut Palm", "Royal Palm", "Peach Palm"],
        photoTip: "Frond shape and trunk details; include fruits if present."
      }
    },
    {
      position: 19,
      slug: "any-beetle",
      label: "Any Beetle",
      emoji: "🪲",
      ancestors: ["Coleoptera"],
      details: {
        whatCounts: "Any beetle.",
        examples: ["Leaf beetles", "Longhorn beetles", "Rhinoceros beetles"],
        photoTip: "Dorsal and side angles; show antennae and pronotum."
      }
    },

    // Row 5
    {
      position: 20,
      slug: "croc-caiman",
      label: "Caiman or Crocodile",
      emoji: "🐊",
      ancestors: ["Alligatoridae", "Crocodylidae"],
      details: {
        whatCounts: "Caiman or crocodile.",
        examples: ["Spectacled Caiman", "American Crocodile"],
        photoTip: "Head profile and eye ridge; include habitat context.",
        safety: "Stay well back from water edges and do not spotlight eyes at close range."
      }
    },
    {
      position: 21,
      slug: "hummingbird",
      label: "Hummingbird",
      emoji: "🪽",
      ancestors: ["Trochilidae"],
      details: {
        whatCounts: "Any hummingbird.",
        examples: ["Rufous-tailed Hummingbird", "Violet-crowned Woodnymph", "White-necked Jacobin"],
        photoTip: "Aim for side profile; catch throat color by shifting your angle."
      }
    },
    {
      position: 22,
      slug: "any-fungus",
      label: "Any Fungus",
      emoji: "🍄",
      ancestors: ["Fungi"],
      details: {
        whatCounts: "Any macrofungus.",
        examples: ["Bracket fungi", "Gilled mushrooms", "Mycena"],
        photoTip: "Cap, gills/pores, and stem; include underside photo."
      }
    },
    {
      position: 23,
      slug: "crab-shrimp",
      label: "Crab or Shrimp",
      emoji: "🦀",
      ancestors: ["Decapoda"],
      details: {
        whatCounts: "Any crab or shrimp.",
        examples: ["Fiddler Crab", "Ghost Crab", "Freshwater Shrimp"],
        photoTip: "Side shot; include claws and carapace; note tide or habitat."
      }
    },
    {
      position: 24,
      slug: "katydid-grasshopper",
      label: "Katydid or Grasshopper",
      emoji: "🦗",
      ancestors: ["Tettigoniidae", "Acrididae"],
      details: {
        whatCounts: "Any katydid or grasshopper.",
        examples: ["Leaf Katydids", "Lubber Grasshoppers"],
        photoTip: "Profile with legs and antennae; leaf-mimics need a clean background."
      }
    }
  ]
};
