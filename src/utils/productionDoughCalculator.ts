export const roundHalf = (val: number): number => {
  return Math.round(val * 2) / 2;
};

export const calculateOvenBakingInfo = (totalPanels: number) => {
  if (totalPanels <= 0) {
    return { full_pans: 0, remainder_panels: 0 };
  }

  const initialFullPans = Math.floor(totalPanels / 3.0);
  const initialRemainder = roundHalf(totalPanels - (initialFullPans * 3.0));

  let fullPans = initialFullPans;
  let remainderPanels = initialRemainder;

  if (initialRemainder > 0 && initialRemainder <= 2.5 && initialFullPans > 1) {
    fullPans = initialFullPans - 1;
    remainderPanels = roundHalf(initialRemainder + 3.0);
  }

  if (remainderPanels === 3.0 || remainderPanels === 3) {
    fullPans += 1;
    remainderPanels = 0;
  }

  return {
    full_pans: fullPans,
    remainder_panels: remainderPanels,
  };
};
