/**
 * BAMBOOLUME Combo Volume Discount Offers (Up to Combo of 5)
 * Available on signature models (except Kyoto Kadomatsu which features authentic modular culms)
 */
const STANDARD_COMBO_OFFERS = [
  { qty: 1, label: "Single (1x)", discountPct: 0, tag: "Standard Price" },
  { qty: 2, label: "Duo Combo (2x)", discountPct: 10, tag: "Save 10%" },
  { qty: 3, label: "Trio Combo (3x)", discountPct: 13, tag: "Save 13%" },
  { qty: 4, label: "Garden Quad (4x)", discountPct: 16, tag: "Save 16%" },
  { qty: 5, label: "Estate Set (5x)", discountPct: 20, tag: "Save 20% • Best Value" }
];

const PRODUCTS_DATA = [
  {
    id: "lantern-1",
    name: "The Zen Pavilion Hanging Solar Lantern",
    category: "hanging",
    price: 67.99,
    originalPrice: 89.99,
    rating: 4.9,
    reviewsCount: 348,
    badge: "hot",
    badgeText: "2 SIZE OPTIONS",
    inStock: true,
    stockCount: 18,
    isFeatured: true,
    image: "./assets/bamboo_hanging_patio_primary.jpg",
    gallery: [
      "./assets/bamboo_hanging_patio_primary.jpg",
      "./assets/bamboo_hanging_dining_canopy.jpg",
      "./assets/bamboo_hanging_small_22cm.jpg",
      "./assets/bamboo_hanging_large_24cm.jpg",
      "./assets/bamboo_hanging_lantern.jpg"
    ],
    description: "Handcrafted from seasoned organic Moso bamboo weave with a weather-treated hanging rope and solar lid. Available in two artisanal silhouettes: Small Cylinder (22cm × 16cm) and Large Teardrop Urn (24cm × 20cm). Delivers up to 14 hours of warm amber twilight illumination.",
    specs: [
      "Choice of 2 Silhouettes: Small Cylinder (22cm × 16cm) & Large Teardrop Urn (24cm × 20cm)",
      "Interwoven Natural Honey Moso Bamboo Framework with Jute Hanging Rope",
      "High-Efficiency Monocrystalline Solar Top Lid with Frosted Candle Diffuser",
      "2200K Warm Amber Candle-Flicker & Steady Modes with Twilight Sensor",
      "IP65 Marine-Grade Weatherproof & Water-Resistant Construction"
    ],
    solarSpecs: {
      panel: "Monocrystalline Silicon (22% efficiency)",
      battery: "2200mAh LiFePO4 All-Weather Cell",
      runtime: "12 - 14 Hours",
      lumens: "85 Lumens (Ambient Warm Glow)",
      cct: "2200K Candlelight Amber"
    },
    variants: {
      colors: ["Natural Golden Bamboo", "Smoked Teak Bamboo", "Antique Amber"],
      sizes: [
        {
          id: "small-cylinder",
          label: "Small Cylinder",
          dimension: "22cm H × 16cm Dia",
          height: "22cm",
          diameter: "16cm",
          price: 67.99,
          originalPrice: 89.99,
          image: "./assets/bamboo_hanging_small_22cm.jpg",
          desc: "Compact cylindrical drum weave (22cm height × 16cm diameter / 8.66\" × 6.3\"). Ideal for tree branches, porch hooks, balcony railings, and intimate pergolas."
        },
        {
          id: "large-teardrop",
          label: "Large Teardrop Urn",
          dimension: "24cm H × 20cm Dia",
          height: "24cm",
          diameter: "20cm",
          price: 109.99,
          originalPrice: 139.99,
          image: "./assets/bamboo_hanging_large_24cm.jpg",
          desc: "Full teardrop bulbous basket weave (24cm height × 20cm diameter / 9.45\" × 7.87\"). Eye-catching focal silhouette for tall trees, gazebo centers, and veranda eaves."
        }
      ]
    },
    comboOffers: STANDARD_COMBO_OFFERS
  },
  {
    id: "lantern-2",
    name: "The Kyoto Kadomatsu Bamboo Stalk Solar",
    category: "pathway",
    price: 117.99,
    originalPrice: 149.99,
    rating: 4.8,
    reviewsCount: 215,
    badge: "popular",
    badgeText: "3 SIZE OPTIONS",
    inStock: true,
    stockCount: 28,
    isFeatured: true,
    image: "./assets/bamboo_kadomatsu_pathway_primary.jpg",
    gallery: [
      "./assets/bamboo_kadomatsu_pathway_primary.jpg",
      "./assets/bamboo_kadomatsu_lawn_border.jpg",
      "./assets/bamboo_kadomatsu_trio.jpg",
      "./assets/bamboo_stalk_small_30cm.jpg",
      "./assets/bamboo_stalk_medium_40cm.jpg",
      "./assets/bamboo_stalk_large_50cm.jpg"
    ],
    description: "Inspired by traditional Japanese Kadomatsu bamboo artistry. Available in Small (30cm), Medium (40cm), Large (50cm), or as a Complete Harmonious 3-Stalk Garden Trio. Crafted from natural hollow Moso bamboo with internal 2200K amber solar candlelight.",
    specs: [
      "Natural Moso Bamboo Culm with Authentic Diagonal Kadomatsu Cut",
      "Choice of 3 Sizes: Small (30cm), Medium (40cm), Large (50cm) or Trio Bundle",
      "Standardized 9.5cm Outer Culm Diameter with Weather-Sealed Base",
      "Integrated 2200K Warm Amber Candlelight Illuminating Inside the Stalk",
      "Concealed Monocrystalline Solar Top Collector with All-Weather LiFePO4 Cell"
    ],
    solarSpecs: {
      panel: "Concealed High-Efficiency Solar Collector (2.2W)",
      battery: "2200mAh All-Weather LiFePO4",
      runtime: "12 - 14 Hours",
      lumens: "80 Lumens Warm Amber Radiance",
      cct: "2200K Golden Candlelight Amber"
    },
    variants: {
      sizes: [
        {
          id: "small",
          label: "Small",
          dimension: "30cm × 9.5cm",
          height: "30cm",
          diameter: "9.5cm",
          price: 117.99,
          originalPrice: 149.99,
          image: "./assets/bamboo_stalk_small_30cm.jpg",
          desc: "Compact 30cm single bamboo stalk. Ideal for stone steps, potted arrangements, and low garden borders."
        },
        {
          id: "medium",
          label: "Medium",
          dimension: "40cm × 9.5cm",
          height: "40cm",
          diameter: "9.5cm",
          price: 143.99,
          originalPrice: 179.99,
          image: "./assets/bamboo_stalk_medium_40cm.jpg",
          desc: "Balanced 40cm natural bamboo culm. Perfect for garden pathways, lawn edges, and rockery landscaping."
        },
        {
          id: "large",
          label: "Large",
          dimension: "50cm × 9.5cm",
          height: "50cm",
          diameter: "9.5cm",
          price: 188.99,
          originalPrice: 229.99,
          image: "./assets/bamboo_stalk_large_50cm.jpg",
          desc: "Stately 50cm tall bamboo culm lantern. Impressive architectural presence for patio entrances and garden focal points."
        },
        {
          id: "trio",
          label: "Complete Trio Set",
          dimension: "30cm + 40cm + 50cm Trio",
          height: "30cm, 40cm & 50cm",
          diameter: "9.5cm each",
          price: 383.78,
          originalPrice: 450.97,
          image: "./assets/bamboo_kadomatsu_trio.jpg",
          desc: "The full 3-piece Kadomatsu arrangement (Small 30cm + Medium 40cm + Large 50cm) creating the harmonious Zen garden cluster shown in the twilight garden photo."
        }
      ]
    }
  },
  {
    id: "lantern-3",
    name: "The Riviera Terrace Honeycomb Tabletop Solar Lantern",
    category: "tabletop",
    price: 64.99,
    originalPrice: 84.99,
    rating: 5.0,
    reviewsCount: 182,
    badge: "artisan",
    badgeText: "ARTISAN PICK",
    inStock: true,
    stockCount: 9,
    isFeatured: true,
    image: "./assets/bamboo_terrace_shadow_primary.jpg",
    gallery: [
      "./assets/bamboo_terrace_shadow_primary.jpg",
      "./assets/bamboo_terrace_dining_patio.jpg",
      "./assets/bamboo_terrace_tabletop.jpg"
    ],
    description: "Artisan open-weave bamboo lattice lantern designed for al fresco dining tables, veranda railings, and seaside terraces. Projects mesmerizing geometric honeycomb shadow patterns across table linens and evening gathering spaces.",
    specs: [
      "Intricate Honeycomb-Lattice Open Bamboo Weave",
      "Projects Hypnotic Diamond & Honeycomb Ambient Shadows",
      "Concealed Top-Mounted Solar Disk with LiFePO4 Reserve",
      "Natural Rope Carrying Handle & Stable Weighted Teak Rim",
      "3-Stage Capacitive Dimmer (Ambient 30%, Dining 70%, Radiance 100%)"
    ],
    solarSpecs: {
      panel: "Top-Mounted Monocrystalline Solar Disc (3.0W)",
      battery: "3200mAh Extended Reserve LiFePO4 Cell",
      runtime: "14 - 16 Hours",
      lumens: "120 Lumens Dynamic Shadow Projection",
      cct: "2400K Warm Sunset Amber"
    },
    variants: {
      colors: ["Natural Golden Bamboo", "Sun-Bleached Sand", "Deep Espresso"]
    },
    comboOffers: STANDARD_COMBO_OFFERS
  },
  {
    id: "lantern-4",
    name: "The Taketora Patio Tripod Solar Floor Lantern",
    category: "floor",
    price: 96.99,
    originalPrice: 129.99,
    rating: 5.0,
    reviewsCount: 146,
    badge: "new",
    badgeText: "NEW ARRIVAL",
    inStock: true,
    stockCount: 14,
    isFeatured: true,
    image: "./assets/bamboo_floor_tower_primary.jpg",
    gallery: [
      "./assets/bamboo_floor_tower_primary.jpg",
      "./assets/bamboo_floor_tower_dining_patio.jpg",
      "./assets/bamboo_floor_tower_night.jpg",
      "./assets/bamboo_floor_tower_dimensions.jpg"
    ],
    description: "Architectural 58cm freestanding solar floor lantern raised on slender matte black tripod legs. Vertical slender bamboo cane reeds encircle an internal warm amber candle, projecting 360° radial light beams across outdoor decks, veranda walls, and poolside lounges.",
    specs: [
      "58cm Total Standing Height with 22cm Stable Base & 12cm Top Collar",
      "Vertical Natural Bamboo Cane Reeds Casting 360° Radial Shadow Beams",
      "Elevated Matte Black Powder-Coated Metal Tripod Base with Non-Slip Rubber Feet",
      "Concealed 3.5W High-Efficiency Monocrystalline Solar Top Disc with LiFePO4 Reserve",
      "2200K Warm Amber Edison-Style Filament LED with Automated Twilight Sensor",
      "IP65 Heavy-Duty Marine Weatherproof & Rust-Resistant Hardware"
    ],
    solarSpecs: {
      panel: "Top-Mounted Monocrystalline Solar Disc (3.5W)",
      battery: "3400mAh Extended Reserve LiFePO4 All-Weather Cell",
      runtime: "14 - 16 Hours",
      lumens: "135 Lumens (360° Radial Slat Shadow Projection)",
      cct: "2200K Candlelight Amber"
    },
    variants: {
      colors: ["Natural Blonde Bamboo", "Caramel Smoked Bamboo", "Weathered Driftwood"]
    },
    comboOffers: STANDARD_COMBO_OFFERS
  }
];

// Export to global scope
window.PRODUCTS_DATA = PRODUCTS_DATA;
