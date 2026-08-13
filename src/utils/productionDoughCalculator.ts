import { ProductionItem } from '../types/production';

export const roundHalf = (num: number): number => Math.round(num * 10) / 10;

export const recalculateItem = (item: ProductionItem): ProductionItem => {
  const requiredQty = item.order_qty + item.extra_qty;
  const prodQty = Math.max(0, requiredQty - item.carryover_qty);
  const batchSize = item.batch_size || 8;
  const minBumper = item.min_bumper_qty ?? 2;

  let basePanels = 0;
  let panels = 0;
  let isBumperApplied = false;

  if (item.category === '미니큐브') {
    basePanels = Math.ceil(prodQty / 2.0);
    panels = basePanels;
  } else {
    basePanels = prodQty > 0 ? Math.ceil(prodQty / batchSize) : 0;
    const baseExcess = basePanels * batchSize - prodQty;

    if (prodQty > 0 && baseExcess < minBumper) {
      panels = basePanels + 1;
      isBumperApplied = true;
    } else {
      panels = basePanels;
      isBumperApplied = false;
    }
  }

  const excessQty = panels * batchSize - prodQty;

  return {
    ...item,
    required_qty: requiredQty,
    production_qty: prodQty,
    base_panels: basePanels,
    panels: panels,
    is_bumper_applied: isBumperApplied,
    excess_qty: excessQty,
    halfpack_order_qty: item.category === '미니큐브' ? item.order_qty : undefined,
    halfpack_panels: item.category === '미니큐브' ? roundHalf(item.order_qty / 2.0) : undefined,
  };
};

export interface CombinedSconeRow {
  sconeItem: ProductionItem;
  itemIndex: number;
  matchedHp?: ProductionItem;
  hpIndex: number;
  sconeDoughPanels: number;
  hpOrderBags: number;
  hpPanels: number;
  totalDoughPanels: number;
  finalPanels: number;
  isHalfpackCarryover: boolean;
  isBumper: boolean;
  excessQty: number;
}

export const calculateCombinedSconeRows = (items: ProductionItem[]) => {
  const triangleItems = items.filter((i) => i.category === '삼각');
  const barItems = items.filter((i) => i.category === '바');
  const halfpackItems = items.filter((i) => i.category === '미니큐브');

  // Combined Rows logic for Triangle Scones + Matched Halfpacks (1 panel = 8 pieces, 1 bag = 4 pieces = 0.5 panel)
  const combinedTriangleRows: CombinedSconeRow[] = triangleItems.map((triItem) => {
    const matchedHp = halfpackItems.find(
      (hp) =>
        hp.is_confirmed === true &&
        hp.parent_scone_name &&
        hp.parent_scone_name === triItem.product_name
    );

    const triIndex = items.findIndex((i) => i.product_name === triItem.product_name);
    const hpIndex = matchedHp ? items.findIndex((i) => i.product_name === matchedHp.product_name) : -1;

    const hpOrderBags = matchedHp ? matchedHp.order_qty : 0;
    const hpPanels = matchedHp ? roundHalf(hpOrderBags / 2.0) : 0;

    const rawTriDoughPanels = triItem.production_qty / 8.0;
    const hpDoughPanels = hpOrderBags / 2.0;

    const totalDoughPanels = rawTriDoughPanels + hpDoughPanels;
    let baseCombinedPanels = totalDoughPanels > 0 ? Math.ceil(totalDoughPanels) : 0;

    const totalConsumedPieces = triItem.production_qty + (hpOrderBags * 4);
    let finalPanels = baseCombinedPanels;
    let isBumper = false;
    const minBumper = triItem.min_bumper_qty ?? 2;

    if ((triItem.production_qty > 0 || hpOrderBags > 0) && baseCombinedPanels > 0) {
      while ((finalPanels * 8 - totalConsumedPieces) < minBumper) {
        finalPanels += 1;
        isBumper = true;
      }
    }

    const bumperExtraPanels = finalPanels - baseCombinedPanels;
    const triDoughPanels = roundHalf(rawTriDoughPanels + bumperExtraPanels);

    const isHalfpackCarryover = (hpOrderBags % 2 === 1) && (triItem.production_qty > 0);

    const totalProducedPieces = finalPanels * 8;
    const excessQty = totalProducedPieces > 0 ? Math.max(0, totalProducedPieces - totalConsumedPieces) : 0;

    return {
      sconeItem: triItem,
      itemIndex: triIndex,
      matchedHp,
      hpIndex,
      sconeDoughPanels: triDoughPanels,
      hpOrderBags,
      hpPanels,
      totalDoughPanels,
      finalPanels,
      isHalfpackCarryover,
      isBumper,
      excessQty,
    };
  });

  // Combined Rows logic for Bar Scones + Matched Halfpacks (1 panel = 10 pieces, 1 bag = 5 pieces = 0.5 panel)
  const combinedBarRows: CombinedSconeRow[] = barItems.map((barItem) => {
    const matchedHp = halfpackItems.find(
      (hp) =>
        hp.is_confirmed === true &&
        hp.parent_scone_name &&
        hp.parent_scone_name === barItem.product_name
    );

    const barIndex = items.findIndex((i) => i.product_name === barItem.product_name);
    const hpIndex = matchedHp ? items.findIndex((i) => i.product_name === matchedHp.product_name) : -1;

    const hpOrderBags = matchedHp ? matchedHp.order_qty : 0;
    const hpPanels = matchedHp ? roundHalf(hpOrderBags / 2.0) : 0;

    const rawBarDoughPanels = barItem.production_qty / 10.0;
    const hpDoughPanels = hpOrderBags / 2.0;

    const totalDoughPanels = rawBarDoughPanels + hpDoughPanels;
    let baseCombinedPanels = totalDoughPanels > 0 ? Math.ceil(totalDoughPanels) : 0;

    const totalConsumedPieces = barItem.production_qty + (hpOrderBags * 5);

    let finalPanels = baseCombinedPanels;
    let isBumper = false;
    const minBumper = barItem.min_bumper_qty ?? 2;

    if ((barItem.production_qty > 0 || hpOrderBags > 0) && baseCombinedPanels > 0) {
      while ((finalPanels * 10 - totalConsumedPieces) < minBumper) {
        finalPanels += 1;
        isBumper = true;
      }
    }

    const bumperExtraPanels = finalPanels - baseCombinedPanels;
    const barDoughPanels = roundHalf(rawBarDoughPanels + bumperExtraPanels);

    const isHalfpackCarryover = (hpOrderBags % 2 === 1) && (barItem.production_qty > 0);

    const totalProducedPieces = finalPanels * 10;
    const excessQty = totalProducedPieces > 0 ? Math.max(0, totalProducedPieces - totalConsumedPieces) : 0;

    return {
      sconeItem: barItem,
      itemIndex: barIndex,
      matchedHp,
      hpIndex,
      sconeDoughPanels: barDoughPanels,
      hpOrderBags,
      hpPanels,
      totalDoughPanels,
      finalPanels,
      isHalfpackCarryover,
      isBumper,
      excessQty,
    };
  });

  const grandTotalTrianglePanels = combinedTriangleRows.reduce((a, r) => a + r.finalPanels, 0);
  const grandTotalBarPanels = combinedBarRows.reduce((a, r) => a + r.finalPanels, 0);
  const grandTotalAllPanels = grandTotalTrianglePanels + grandTotalBarPanels;

  return {
    combinedTriangleRows,
    combinedBarRows,
    grandTotalAllPanels,
    halfpackItems,
  };
};
