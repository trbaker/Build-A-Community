// Build a Community — feature catalog
// Edit this file to add, remove, rename, or re-icon features and categories.
// Loaded before app.js.

const APP_NAME    = 'Build a Community';
const APP_VERSION = '1.0';

// ─────────────────────────────────────────────
//  FEATURE CATALOG
//  Each category has a key, label, and color (conventional land-use colors).
//  Each feature has a type (stored in the data), a label, and an icon.
//  `icon` may be an emoji OR an https URL to a PNG — URLs become picture
//  marker symbols in ArcGIS; emoji fall back to a color-coded circle.
// ─────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'residential', label: 'Housing', color: '#f2c14e', rgb: [242,193,78],
    features: [
      { type: 'single-family',   label: 'Single-family homes', icon: '🏠' },
      { type: 'townhomes',       label: 'Townhomes',           icon: '🏘️' },
      { type: 'apartments',      label: 'Apartments',          icon: '🏢' },
      { type: 'mixed-use',       label: 'Mixed-use building',  icon: '🏬' },
      { type: 'student-housing', label: 'Student housing',     icon: '🛌' },
      { type: 'senior-housing',  label: 'Senior housing',      icon: '🧓' },
      { type: 'shelter',         label: 'Shelter / supportive housing', icon: '🛏️' },
      { type: 'mobile-homes',    label: 'Mobile home park',    icon: '🚐' }
    ]
  },
  {
    key: 'civic', label: 'Civic & services', color: '#3d7cc9', rgb: [61,124,201],
    features: [
      { type: 'city-hall',        label: 'City hall',          icon: '🏛️' },
      { type: 'school',           label: 'K–12 school',        icon: '🏫' },
      { type: 'college',          label: 'College / university', icon: '🎓' },
      { type: 'library',          label: 'Library',            icon: '📚' },
      { type: 'hospital',         label: 'Hospital',           icon: '🏥' },
      { type: 'clinic',           label: 'Clinic',             icon: '🩺' },
      { type: 'fire-station',     label: 'Fire station',       icon: '🚒' },
      { type: 'police',           label: 'Police station',     icon: '🚓' },
      { type: 'post-office',      label: 'Post office',        icon: '📮' },
      { type: 'community-center', label: 'Community center',   icon: '🤝' },
      { type: 'worship',          label: 'Place of worship',   icon: '🕊️' },
      { type: 'museum',           label: 'Museum',             icon: '🖼️' },
      { type: 'theater',          label: 'Theater / arts venue', icon: '🎭' },
      { type: 'childcare',        label: 'Childcare center',   icon: '🧸' }
    ]
  },
  {
    key: 'commercial', label: 'Commercial', color: '#d9534f', rgb: [217,83,79],
    features: [
      { type: 'grocery',        label: 'Grocery store',      icon: '🛒' },
      { type: 'corner-store',   label: 'Corner store',       icon: '🏪' },
      { type: 'restaurant',     label: 'Restaurant',         icon: '🍽️' },
      { type: 'cafe',           label: 'Café',               icon: '☕' },
      { type: 'shopping',       label: 'Shopping center',    icon: '🛍️' },
      { type: 'office',         label: 'Office building',    icon: '💼' },
      { type: 'bank',           label: 'Bank',               icon: '🏦' },
      { type: 'hotel',          label: 'Hotel',              icon: '🏨' },
      { type: 'gas-station',    label: 'Gas station',        icon: '⛽' },
      { type: 'pharmacy',       label: 'Pharmacy',           icon: '💊' },
      { type: 'farmers-market', label: 'Farmers market',     icon: '🥕' },
      { type: 'gym',            label: 'Gym / fitness',      icon: '🏋️' }
    ]
  },
  {
    key: 'industrial', label: 'Industrial', color: '#8e6bb8', rgb: [142,107,184],
    features: [
      { type: 'factory',      label: 'Factory',              icon: '🏭' },
      { type: 'warehouse',    label: 'Warehouse / logistics', icon: '📦' },
      { type: 'data-center',  label: 'Data center',          icon: '🖥️' },
      { type: 'workshop',     label: 'Light industry / makerspace', icon: '🔧' },
      { type: 'research',     label: 'Research lab',         icon: '🔬' }
    ]
  },
  {
    key: 'transport', label: 'Transportation', color: '#7a838f', rgb: [122,131,143],
    features: [
      { type: 'bus-stop',       label: 'Bus stop',           icon: '🚏' },
      { type: 'transit-station',label: 'Rail / transit station', icon: '🚉' },
      { type: 'bike',           label: 'Bike lane / bike share', icon: '🚲' },
      { type: 'parking',        label: 'Parking',            icon: '🅿️' },
      { type: 'crosswalk',      label: 'Pedestrian crossing', icon: '🚶' },
      { type: 'highway',        label: 'Highway interchange', icon: '🛣️' },
      { type: 'ev-charging',    label: 'EV charging',        icon: '🔌' },
      { type: 'airport',        label: 'Airport',            icon: '✈️' },
      { type: 'port',           label: 'Port / harbor',      icon: '⚓' }
    ]
  },
  {
    key: 'openspace', label: 'Open space & recreation', color: '#5aa469', rgb: [90,164,105],
    features: [
      { type: 'park',            label: 'Park',               icon: '🌳' },
      { type: 'playground',      label: 'Playground',         icon: '🛝' },
      { type: 'community-garden',label: 'Community garden',   icon: '🌱' },
      { type: 'sports-fields',   label: 'Sports fields',      icon: '⚽' },
      { type: 'trail',           label: 'Trail / greenway',   icon: '🥾' },
      { type: 'plaza',           label: 'Plaza / public square', icon: '⛲' },
      { type: 'nature-preserve', label: 'Nature preserve',    icon: '🏞️' },
      { type: 'stadium',         label: 'Stadium / arena',    icon: '🏟️' },
      { type: 'farmland',        label: 'Farmland',           icon: '🌾' },
      { type: 'cemetery',        label: 'Cemetery',           icon: '🪦' }
    ]
  },
  {
    key: 'utilities', label: 'Utilities & infrastructure', color: '#c2703d', rgb: [194,112,61],
    features: [
      { type: 'power-plant',     label: 'Power plant',         icon: '⚡' },
      { type: 'solar',           label: 'Solar farm',          icon: '☀️' },
      { type: 'wind',            label: 'Wind turbines',       icon: '🌬️' },
      { type: 'water-treatment', label: 'Water treatment',     icon: '🚰' },
      { type: 'wastewater',      label: 'Wastewater plant',    icon: '🧪' },
      { type: 'recycling',       label: 'Recycling center',    icon: '♻️' },
      { type: 'landfill',        label: 'Landfill',            icon: '🗑️' },
      { type: 'cell-tower',      label: 'Cell tower / broadband', icon: '📡' },
      { type: 'stormwater',      label: 'Stormwater / detention', icon: '💧' }
    ]
  }
];

// Fast lookups
const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
const FEATURE_BY_TYPE = {};
CATEGORIES.forEach(c => c.features.forEach(f => { FEATURE_BY_TYPE[f.type] = { ...f, category: c.key }; }));
