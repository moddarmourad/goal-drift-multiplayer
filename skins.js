'use strict';

const SKIN_CATALOG = [
  { id: 'solar-flare', name: 'Solar Flare', paint: '#ff5b35', accent: '#ffd23f', price: 2, pattern: 'racing' },
  { id: 'deep-space', name: 'Deep Space', paint: '#17143f', accent: '#b76cff', price: 2, pattern: 'twin' },
  { id: 'arctic-fox', name: 'Arctic Fox', paint: '#dff7ff', accent: '#37c9e8', price: 2, pattern: 'rally' },
  { id: 'toxic-comet', name: 'Toxic Comet', paint: '#a5e82e', accent: '#183e24', price: 2, pattern: 'side' },
  { id: 'rose-pulse', name: 'Rose Pulse', paint: '#ff4f91', accent: '#ffd2ec', price: 2, pattern: 'twin' },
  { id: 'midnight-gold', name: 'Midnight Gold', paint: '#171923', accent: '#f6c844', price: 2, pattern: 'racing' },
  { id: 'ocean-drive', name: 'Ocean Drive', paint: '#087eaa', accent: '#65f3dc', price: 2, pattern: 'rally' },
  { id: 'candy-rush', name: 'Candy Rush', paint: '#ff78b9', accent: '#6f57e8', price: 2, pattern: 'twin' },
  { id: 'ember-knight', name: 'Ember Knight', paint: '#551a27', accent: '#ff6b35', price: 2, pattern: 'side' },
  { id: 'mint-condition', name: 'Mint Condition', paint: '#a4f0cf', accent: '#238c79', price: 2, pattern: 'racing' },
  { id: 'blue-lightning', name: 'Blue Lightning', paint: '#235bfa', accent: '#a8e7ff', price: 2, pattern: 'rally' },
  { id: 'desert-royalty', name: 'Desert Royalty', paint: '#d58a45', accent: '#ffe2a2', price: 2, pattern: 'twin' },
  { id: 'plum-shadow', name: 'Plum Shadow', paint: '#49254f', accent: '#f29bff', price: 2, pattern: 'side' },
  { id: 'lime-machine', name: 'Lime Machine', paint: '#d1f232', accent: '#243c0c', price: 2, pattern: 'racing' },
  { id: 'redline', name: 'Redline', paint: '#c51d2d', accent: '#f7f1e7', price: 2, pattern: 'rally' },
  { id: 'pearl-jam', name: 'Pearl Jam', paint: '#eee8d8', accent: '#d67b48', price: 2, pattern: 'twin' },
  { id: 'electric-violet', name: 'Electric Violet', paint: '#613cff', accent: '#52f5ff', price: 2, pattern: 'side' },
  { id: 'copperhead', name: 'Copperhead', paint: '#a74721', accent: '#f8bf71', price: 2, pattern: 'racing' },
  { id: 'rainforest', name: 'Rainforest', paint: '#126744', accent: '#8de08b', price: 2, pattern: 'twin' },
  { id: 'pink-phantom', name: 'Pink Phantom', paint: '#e927a5', accent: '#221936', price: 2, pattern: 'rally' },
  { id: 'storm-chaser', name: 'Storm Chaser', paint: '#475569', accent: '#b7e5ff', price: 2, pattern: 'side' },
  { id: 'sunset-sprint', name: 'Sunset Sprint', paint: '#ff7946', accent: '#8d3eaa', price: 2, pattern: 'racing' },
  { id: 'glacier-glow', name: 'Glacier Glow', paint: '#78d9e8', accent: '#f0ffff', price: 2, pattern: 'twin' },
  { id: 'black-ice', name: 'Black Ice', paint: '#192a39', accent: '#78d9e8', price: 2, pattern: 'rally' },
  { id: 'golden-hour', name: 'Golden Hour', paint: '#e9a51b', accent: '#6b321f', price: 2, pattern: 'side' },
  { id: 'nebula-drift', name: 'Nebula Drift', paint: '#44226e', accent: '#f05bda', price: 3, pattern: 'racing' },
  { id: 'dragon-fruit', name: 'Dragon Fruit', paint: '#e53368', accent: '#91df37', price: 3, pattern: 'twin' },
  { id: 'chrome-tide', name: 'Chrome Tide', paint: '#a9becb', accent: '#176a9b', price: 3, pattern: 'rally' },
  { id: 'volcano-run', name: 'Volcano Run', paint: '#29212a', accent: '#ff3b18', price: 3, pattern: 'side' },
  { id: 'sakura-storm', name: 'Sakura Storm', paint: '#f4acc7', accent: '#554b9c', price: 3, pattern: 'racing' },
  { id: 'citrus-circuit', name: 'Citrus Circuit', paint: '#e8e94a', accent: '#f47a28', price: 3, pattern: 'twin' },
  { id: 'royal-velocity', name: 'Royal Velocity', paint: '#24317b', accent: '#d7b6ff', price: 3, pattern: 'rally' },
  { id: 'cobalt-cobra', name: 'Cobalt Cobra', paint: '#164eac', accent: '#d8ff3e', price: 3, pattern: 'side' },
  { id: 'desert-mirage', name: 'Desert Mirage', paint: '#d9b789', accent: '#cf6251', price: 3, pattern: 'racing' },
  { id: 'aurora-borealis', name: 'Aurora Borealis', paint: '#087f83', accent: '#90ffcf', price: 3, pattern: 'twin' },
  { id: 'strawberry-static', name: 'Strawberry Static', paint: '#d82149', accent: '#ffcae5', price: 3, pattern: 'rally' },
  { id: 'carbon-king', name: 'Carbon King', paint: '#24262a', accent: '#ed5a3c', price: 3, pattern: 'side' },
  { id: 'lemon-laser', name: 'Lemon Laser', paint: '#f2ed38', accent: '#346cdb', price: 3, pattern: 'racing' },
  { id: 'oasis-racer', name: 'Oasis Racer', paint: '#2bb7a5', accent: '#ffe2a0', price: 3, pattern: 'twin' },
  { id: 'haunted-highway', name: 'Haunted Highway', paint: '#282536', accent: '#95e95b', price: 3, pattern: 'rally' },
  { id: 'firework-finale', name: 'Firework Finale', paint: '#203c94', accent: '#ff7be5', price: 3, pattern: 'side' },
  { id: 'coral-crush', name: 'Coral Crush', paint: '#ff735f', accent: '#7f2e65', price: 3, pattern: 'racing' },
  { id: 'frostbite', name: 'Frostbite', paint: '#c7e5ef', accent: '#5769c8', price: 3, pattern: 'twin' },
  { id: 'magma-core', name: 'Magma Core', paint: '#481714', accent: '#ff9c24', price: 3, pattern: 'rally' },
  { id: 'starlight-silver', name: 'Starlight Silver', paint: '#d5d9e3', accent: '#744de8', price: 3, pattern: 'side' },
  { id: 'wildwood-wolf', name: 'Wildwood Wolf', paint: '#435b32', accent: '#d4a65d', price: 3, pattern: 'racing' },
  { id: 'lunar-eclipse', name: 'Lunar Eclipse', paint: '#17172c', accent: '#e1d6ff', price: 3, pattern: 'twin' },
  { id: 'turbo-tangerine', name: 'Turbo Tangerine', paint: '#fb851b', accent: '#4b1f91', price: 3, pattern: 'rally' },
  { id: 'sapphire-surge', name: 'Sapphire Surge', paint: '#1747c7', accent: '#ffb52e', price: 3, pattern: 'side' },
  { id: 'prism-breaker', name: 'Prism Breaker', paint: '#803ce4', accent: '#5af2b8', price: 3, pattern: 'racing' },
];

const COUNTRY_LIST = `
AF|Afghanistan
AL|Albania
DZ|Algeria
AD|Andorra
AO|Angola
AG|Antigua and Barbuda
AR|Argentina
AM|Armenia
AU|Australia
AT|Austria
AZ|Azerbaijan
BS|Bahamas
BH|Bahrain
BD|Bangladesh
BB|Barbados
BY|Belarus
BE|Belgium
BZ|Belize
BJ|Benin
BT|Bhutan
BO|Bolivia
BA|Bosnia and Herzegovina
BW|Botswana
BR|Brazil
BN|Brunei
BG|Bulgaria
BF|Burkina Faso
BI|Burundi
CV|Cabo Verde
KH|Cambodia
CM|Cameroon
CA|Canada
CF|Central African Republic
TD|Chad
CL|Chile
CN|China
CO|Colombia
KM|Comoros
CG|Congo
CR|Costa Rica
CI|Côte d’Ivoire
HR|Croatia
CU|Cuba
CY|Cyprus
CZ|Czechia
KP|North Korea
CD|Democratic Republic of the Congo
DK|Denmark
DJ|Djibouti
DM|Dominica
DO|Dominican Republic
EC|Ecuador
EG|Egypt
SV|El Salvador
GQ|Equatorial Guinea
ER|Eritrea
EE|Estonia
SZ|Eswatini
ET|Ethiopia
FJ|Fiji
FI|Finland
FR|France
GA|Gabon
GM|Gambia
GE|Georgia
DE|Germany
GH|Ghana
GR|Greece
GD|Grenada
GT|Guatemala
GN|Guinea
GW|Guinea-Bissau
GY|Guyana
HT|Haiti
HN|Honduras
HU|Hungary
IS|Iceland
IN|India
ID|Indonesia
IR|Iran
IQ|Iraq
IE|Ireland
IL|Israel
IT|Italy
JM|Jamaica
JP|Japan
JO|Jordan
KZ|Kazakhstan
KE|Kenya
KI|Kiribati
KW|Kuwait
KG|Kyrgyzstan
LA|Laos
LV|Latvia
LB|Lebanon
LS|Lesotho
LR|Liberia
LY|Libya
LI|Liechtenstein
LT|Lithuania
LU|Luxembourg
MG|Madagascar
MW|Malawi
MY|Malaysia
MV|Maldives
ML|Mali
MT|Malta
MH|Marshall Islands
MR|Mauritania
MU|Mauritius
MX|Mexico
FM|Micronesia
MC|Monaco
MN|Mongolia
ME|Montenegro
MA|Morocco
MZ|Mozambique
MM|Myanmar
NA|Namibia
NR|Nauru
NP|Nepal
NL|Netherlands
NZ|New Zealand
NI|Nicaragua
NE|Niger
NG|Nigeria
MK|North Macedonia
NO|Norway
OM|Oman
PK|Pakistan
PW|Palau
PS|Palestine
PA|Panama
PG|Papua New Guinea
PY|Paraguay
PE|Peru
PH|Philippines
PL|Poland
PT|Portugal
QA|Qatar
KR|South Korea
MD|Moldova
RO|Romania
RU|Russia
RW|Rwanda
KN|Saint Kitts and Nevis
LC|Saint Lucia
VC|Saint Vincent and the Grenadines
WS|Samoa
SM|San Marino
ST|São Tomé and Príncipe
SA|Saudi Arabia
SN|Senegal
RS|Serbia
SC|Seychelles
SL|Sierra Leone
SG|Singapore
SK|Slovakia
SI|Slovenia
SB|Solomon Islands
SO|Somalia
ZA|South Africa
SS|South Sudan
ES|Spain
LK|Sri Lanka
SD|Sudan
SR|Suriname
SE|Sweden
CH|Switzerland
SY|Syria
TJ|Tajikistan
TZ|Tanzania
TH|Thailand
TL|Timor-Leste
TG|Togo
TO|Tonga
TT|Trinidad and Tobago
TN|Tunisia
TR|Türkiye
TM|Turkmenistan
TV|Tuvalu
UG|Uganda
UA|Ukraine
AE|United Arab Emirates
GB|United Kingdom
US|United States
UY|Uruguay
UZ|Uzbekistan
VU|Vanuatu
VA|Vatican City
VE|Venezuela
VN|Vietnam
YE|Yemen
ZM|Zambia
ZW|Zimbabwe`.trim().split('\n').map((row) => {
  const [code, name] = row.split('|');
  return { code, name };
});

function flagEmoji(code) {
  return String.fromCodePoint(...code.split('').map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}
const countrySkins = COUNTRY_LIST.map((country) => {
  return {
    id: `flag-${country.code.toLowerCase()}`,
    name: `${country.name} Flag`,
    flag: flagEmoji(country.code),
    countryCode: country.code,
    paint: '#263247',
    accent: '#f8fafc',
    price: 8,
    pattern: 'solid',
  };
});
SKIN_CATALOG.push(...countrySkins);

if (typeof module !== 'undefined') module.exports = SKIN_CATALOG;
if (typeof window !== 'undefined') window.SKIN_CATALOG = SKIN_CATALOG;
