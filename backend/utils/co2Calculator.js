const CO2_FACTORS = {
  walk:  0.171,
  run:   0.171,
  cycle: 0.158,
  bus:   0.101,
  metro: 0.148,
  ev:    0.087,
};

const POINTS_PER_KM = {
  walk:  25,
  run:   20,
  cycle: 35,
  bus:   30,
  metro: 45,
  ev:    50,
};

const KG_CO2_PER_TREE_PER_YEAR = 21;

function calculate(distance, mode) {
  if (!CO2_FACTORS[mode]) throw new Error(`Unknown mode: ${mode}`);

  const dist            = parseFloat(distance);
  // Calculate CO2 saved based on factor
  const co2_saved       = parseFloat((dist * CO2_FACTORS[mode]).toFixed(4));
  const trees_equivalent= parseFloat((co2_saved / KG_CO2_PER_TREE_PER_YEAR).toFixed(4));
  const points          = Math.round(dist * POINTS_PER_KM[mode]);

  return { co2_saved, trees_equivalent, points, distance: dist, mode };
}

module.exports = { calculate, CO2_FACTORS, POINTS_PER_KM };