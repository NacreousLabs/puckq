export const MOCK_TEAMS = [
  {
    id: 1,
    name: "Toronto Maple Leafs",
    abbreviation: "TOR",
    logo: "🍁",
    capHit: 87500000,
    capSpace: 1000000,
    projectedCapSpace: 1200000,
    ltir: 4500000,
    contracts: 48,
    color: "#00205B"
  },
  {
    id: 2,
    name: "Edmonton Oilers",
    abbreviation: "EDM",
    logo: "🛢️",
    capHit: 88000000,
    capSpace: 500000,
    projectedCapSpace: 850000,
    ltir: 2300000,
    contracts: 46,
    color: "#FF4C00"
  },
  {
    id: 3,
    name: "Colorado Avalanche",
    abbreviation: "COL",
    logo: "🏔️",
    capHit: 85000000,
    capSpace: 3500000,
    projectedCapSpace: 4100000,
    ltir: 7000000,
    contracts: 49,
    color: "#6F263D"
  },
  {
    id: 4,
    name: "Boston Bruins",
    abbreviation: "BOS",
    logo: "🐻",
    capHit: 86200000,
    capSpace: 2300000,
    projectedCapSpace: 2300000,
    ltir: 0,
    contracts: 45,
    color: "#FFB81C"
  }
];

export const MOCK_PLAYERS = [
  {
    id: 1,
    name: "Auston Matthews",
    teamId: 1,
    position: "C",
    age: 26,
    capHit: 13250000,
    capPercentage: 15.1,
    contractLength: 4,
    expiryYear: 2028,
    draftYear: 2016,
    draftRound: 1,
    draftOverall: 1,
    status: "Signed"
  },
  {
    id: 2,
    name: "Connor McDavid",
    teamId: 2,
    position: "C",
    age: 27,
    capHit: 12500000,
    capPercentage: 14.2,
    contractLength: 8,
    expiryYear: 2026,
    draftYear: 2015,
    draftRound: 1,
    draftOverall: 1,
    status: "Signed"
  },
  {
    id: 3,
    name: "Nathan MacKinnon",
    teamId: 3,
    position: "C",
    age: 28,
    capHit: 12600000,
    capPercentage: 14.3,
    contractLength: 8,
    expiryYear: 2031,
    draftYear: 2013,
    draftRound: 1,
    draftOverall: 1,
    status: "Signed"
  },
  {
    id: 4,
    name: "David Pastrnak",
    teamId: 4,
    position: "RW",
    age: 27,
    capHit: 11250000,
    capPercentage: 12.8,
    contractLength: 8,
    expiryYear: 2031,
    draftYear: 2014,
    draftRound: 1,
    draftOverall: 25,
    status: "Signed"
  },
  {
    id: 5,
    name: "William Nylander",
    teamId: 1,
    position: "RW",
    age: 27,
    capHit: 11500000,
    capPercentage: 13.1,
    contractLength: 8,
    expiryYear: 2032,
    draftYear: 2014,
    draftRound: 1,
    draftOverall: 8,
    status: "Signed"
  },
];

export const RECENT_TRANSACTIONS = [
  {
    id: 1,
    type: "Extension",
    player: "William Nylander",
    team: "TOR",
    details: "8 years, $92M ($11.5M AAV)",
    date: "2024-01-08"
  },
  {
    id: 2,
    type: "Trade",
    player: "Elias Lindholm",
    team: "VAN -> BOS",
    details: "Acquired for 1st round pick, roster player",
    date: "2024-01-31"
  },
  {
    id: 3,
    type: "Signing",
    player: "Corey Perry",
    team: "EDM",
    details: "1 year, $775k",
    date: "2024-01-22"
  },
  {
    id: 4,
    type: "Waivers",
    player: "Ilya Samsonov",
    team: "TOR",
    details: "Cleared waivers, assigned to Marlies",
    date: "2024-01-01"
  }
];

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};