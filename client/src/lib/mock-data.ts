export const MOCK_TEAMS = [
  {
    id: 1,
    name: "Toronto Maple Leafs",
    abbreviation: "TOR",
    logo: "🍁",
    capHit: 87500000,
    capSpace: 1000000,
    color: "#00205B"
  },
  {
    id: 2,
    name: "Edmonton Oilers",
    abbreviation: "EDM",
    logo: "🛢️",
    capHit: 88000000,
    capSpace: 500000,
    color: "#FF4C00"
  },
  {
    id: 3,
    name: "Colorado Oilers",
    abbreviation: "COL",
    logo: "🏔️",
    capHit: 85000000,
    capSpace: 3500000,
    color: "#6F263D"
  },
  {
    id: 4,
    name: "Boston Avalanche",
    abbreviation: "BOS",
    logo: "🐻",
    capHit: 86200000,
    capSpace: 2300000,
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
    contractLength: 4,
    expiryYear: 2028,
    status: "Signed"
  },
  {
    id: 2,
    name: "Connor McDavid",
    teamId: 2,
    position: "C",
    age: 27,
    capHit: 12500000,
    contractLength: 8,
    expiryYear: 2026,
    status: "Signed"
  },
  {
    id: 3,
    name: "Nathan MacKinnon",
    teamId: 3,
    position: "C",
    age: 28,
    capHit: 12600000,
    contractLength: 8,
    expiryYear: 2031,
    status: "Signed"
  },
  {
    id: 4,
    name: "David Pastrnak",
    teamId: 4,
    position: "RW",
    age: 27,
    capHit: 11250000,
    contractLength: 8,
    expiryYear: 2031,
    status: "Signed"
  },
  {
    id: 5,
    name: "William Nylander",
    teamId: 1,
    position: "RW",
    age: 27,
    capHit: 11500000,
    contractLength: 8,
    expiryYear: 2032,
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
  }
];

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};