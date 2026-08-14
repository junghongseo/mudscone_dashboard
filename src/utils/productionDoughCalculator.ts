import { ProductionItem } from '../types/production';

export const roundHalf = (num: number): number => Math.round(num * 10) / 10;

export const recalculateItem = (item: ProductionItem): ProductionItem => {
  const requiredQty = item.order_qty + item.extra_qty;
  const prodQty = Math.max(0, requiredQty - item.carryover_qty);
  const batchSize = item.batch_size || 8;
  const extraPanels = item.min_bumper_qty ?? 0;

  let basePanels = 0;
  let panels = 0;

  if (item.category === '미니큐브') {
    basePanels = Math.ceil(prodQty / 2.0);
    panels = basePanels;
  } else if (item.category === '미니쉐이크') {
    basePanels = Math.ceil(prodQty / 4.0);
    panels = basePanels;
  } else if (item.category === '스틱') {
    const packs = prodQty * 3;
    basePanels = Math.ceil(packs / 9.0);
    panels = basePanels;
  } else {
    basePanels = prodQty > 0 ? Math.ceil(prodQty / batchSize) : 0;
    panels = basePanels + extraPanels;
  }

  const excessQty = item.category === '스틱'
    ? (panels * 9) - (prodQty * 3)
    : item.category === '미니쉐이크'
    ? (panels * 4) - prodQty
    : (panels * batchSize) - prodQty;

  return {
    ...item,
    required_qty: requiredQty,
    production_qty: prodQty,
    base_panels: basePanels,
    panels: panels,
    is_bumper_applied: extraPanels > 0,
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
  matchedStick?: ProductionItem;
  stickIndex: number;
  sconeDoughPanels: number;
  hpOrderBags: number;
  hpPanels: number;
  stickOrderPacks: number;
  stickPanels: number;
  stickExcessPacks: number;
  totalDoughPanels: number;
  finalPanels: number;
  isHalfpackCarryover: boolean;
  isBumper: boolean;
  excessQty: number;
}

export interface CombinedMiniShakeRow {
  shakeItem: ProductionItem;
  itemIndex: number;
  orderBags: number;
  extraBags: number;
  carryoverBags: number;
  prodBags: number;
  panels: number;
  excessBags: number;
}

export const calculateCombinedSconeRows = (items: ProductionItem[]) => {
  const triangleItems = items.filter((i) => i.category === '삼각');
  const barItems = items.filter((i) => i.category === '바');
  const halfpackItems = items.filter((i) => i.category === '미니큐브');
  const miniShakeItems = items.filter((i) => i.category === '미니쉐이크');
  const stickItems = items.filter((i) => i.category === '스틱');

  // Combined Rows logic for Triangle Scones + Matched Halfpacks + Matched Sticks
  const combinedTriangleRows: CombinedSconeRow[] = triangleItems.map((triItem) => {
    // Only match when explicitly confirmed AND parent_scone_name matches
    const matchedHp = halfpackItems.find(
      (hp) =>
        hp.is_confirmed === true &&
        hp.parent_scone_name &&
        hp.parent_scone_name.trim() === triItem.product_name.trim()
    );

    const matchedSticks = stickItems.filter(
      (st) =>
        st.is_confirmed === true &&
        st.parent_scone_name &&
        st.parent_scone_name.trim() === triItem.product_name.trim()
    );
    const matchedStick = matchedSticks[0] || null;

    const triIndex = items.findIndex((i) => i.product_name === triItem.product_name);
    const hpIndex = matchedHp ? items.findIndex((i) => i.product_name === matchedHp.product_name) : -1;
    const stickIndex = matchedStick ? items.findIndex((i) => i.product_name === matchedStick.product_name) : -1;

    const hpOrderBags = matchedHp ? matchedHp.order_qty : 0;
    const hpPanels = matchedHp ? roundHalf(hpOrderBags / 2.0) : 0;

    const stickOrderPacks = matchedSticks.reduce((sum, st) => sum + st.production_qty, 0);

    const stickPanels = stickOrderPacks > 0 ? Math.ceil(stickOrderPacks / 9.0) : 0;
    const stickExcessPacks = stickPanels > 0 ? (stickPanels * 9) - stickOrderPacks : 0;

    const extraPanels = triItem.min_bumper_qty ?? 0;
    // Scone dough base unit is ALWAYS 1 FULL PANEL (8 pieces for triangle)
    const baseTriDoughPanels = triItem.production_qty > 0 ? Math.ceil(triItem.production_qty / 8.0) : 0;
    
    // Halfpack odd bag conversion: 1 odd bag adds +0.5 panel to sconeDoughPanels
    const extraHpDoughPanels = (hpOrderBags % 2 === 1) ? 0.5 : 0;
    const triDoughPanels = roundHalf(baseTriDoughPanels + extraPanels + extraHpDoughPanels);

    const totalDoughPanels = triDoughPanels + hpPanels + stickPanels;
    const finalPanels = roundHalf(totalDoughPanels);

    const isHalfpackCarryover = (hpOrderBags % 2 === 1) && (triItem.production_qty > 0);

    const sconeProducedPieces = triDoughPanels * 8;
    const excessQty = sconeProducedPieces > 0 ? Math.max(0, sconeProducedPieces - triItem.production_qty) : 0;

    return {
      sconeItem: triItem,
      itemIndex: triIndex,
      matchedHp,
      hpIndex,
      matchedStick,
      stickIndex,
      sconeDoughPanels: triDoughPanels,
      hpOrderBags,
      hpPanels,
      stickOrderPacks,
      stickPanels,
      stickExcessPacks,
      totalDoughPanels,
      finalPanels,
      isHalfpackCarryover,
      isBumper: extraPanels > 0,
      excessQty,
    };
  });

  // Combined Rows logic for Bar Scones + Matched Halfpacks
  const combinedBarRows: CombinedSconeRow[] = barItems.map((barItem) => {
    const matchedHp = halfpackItems.find(
      (hp) =>
        hp.is_confirmed === true &&
        hp.parent_scone_name &&
        hp.parent_scone_name.trim() === barItem.product_name.trim()
    );

    const barIndex = items.findIndex((i) => i.product_name === barItem.product_name);
    const hpIndex = matchedHp ? items.findIndex((i) => i.product_name === matchedHp.product_name) : -1;

    const hpOrderBags = matchedHp ? matchedHp.order_qty : 0;
    const hpPanels = matchedHp ? roundHalf(hpOrderBags / 2.0) : 0;

    const extraPanels = barItem.min_bumper_qty ?? 0;
    // Scone dough base unit is ALWAYS 1 FULL PANEL (10 pieces for bar)
    const baseBarDoughPanels = barItem.production_qty > 0 ? Math.ceil(barItem.production_qty / 10.0) : 0;
    
    // Halfpack odd bag conversion: 1 odd bag adds +0.5 panel to barDoughPanels
    const extraHpDoughPanels = (hpOrderBags % 2 === 1) ? 0.5 : 0;
    const barDoughPanels = roundHalf(baseBarDoughPanels + extraPanels + extraHpDoughPanels);

    const totalDoughPanels = barDoughPanels + hpPanels;
    const finalPanels = roundHalf(totalDoughPanels);

    const isHalfpackCarryover = (hpOrderBags % 2 === 1) && (barItem.production_qty > 0);

    const totalProducedPieces = barDoughPanels * 10;
    const excessQty = totalProducedPieces > 0 ? Math.max(0, totalProducedPieces - barItem.production_qty) : 0;

    return {
      sconeItem: barItem,
      itemIndex: barIndex,
      matchedHp,
      hpIndex,
      matchedStick: undefined,
      stickIndex: -1,
      sconeDoughPanels: barDoughPanels,
      hpOrderBags,
      hpPanels,
      stickOrderPacks: 0,
      stickPanels: 0,
      stickExcessPacks: 0,
      totalDoughPanels,
      finalPanels,
      isHalfpackCarryover,
      isBumper: extraPanels > 0,
      excessQty,
    };
  });

  // Independent Rows for Mini Shake (1 panel = 4 bags)
  const combinedMiniShakeRows: CombinedMiniShakeRow[] = miniShakeItems.map((shakeItem) => {
    const itemIndex = items.findIndex((i) => i.product_name === shakeItem.product_name);
    const orderBags = shakeItem.order_qty;
    const extraBags = shakeItem.extra_qty;
    const carryoverBags = shakeItem.carryover_qty;
    const prodBags = Math.max(0, orderBags + extraBags - carryoverBags);
    const panels = prodBags > 0 ? Math.ceil(prodBags / 4.0) : 0;
    const excessBags = panels > 0 ? (panels * 4) - prodBags : 0;

    return {
      shakeItem,
      itemIndex,
      orderBags,
      extraBags,
      carryoverBags,
      prodBags,
      panels,
      excessBags,
    };
  });

  const grandTotalTrianglePanels = combinedTriangleRows.reduce((a, r) => a + r.finalPanels, 0);
  const grandTotalBarPanels = combinedBarRows.reduce((a, r) => a + r.finalPanels, 0);
  const grandTotalMiniShakePanels = combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0);
  const grandTotalAllPanels = grandTotalTrianglePanels + grandTotalBarPanels + grandTotalMiniShakePanels;

  // Build unified row sequence following exact order of items
  const unifiedRows: UnifiedProductionRow[] = [];
  items.forEach((item, index) => {
    if (item.is_separator) {
      unifiedRows.push({
        type: 'separator',
        item,
        itemIndex: index,
      });
    } else if (item.category === '삼각') {
      const triRow = combinedTriangleRows.find((r) => r.sconeItem.product_name === item.product_name);
      if (triRow) {
        unifiedRows.push({
          type: 'scone',
          categoryTag: '삼각 (8개)',
          categoryColorClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20',
          row: triRow,
        });
      }
    } else if (item.category === '바') {
      const barRow = combinedBarRows.find((r) => r.sconeItem.product_name === item.product_name);
      if (barRow) {
        unifiedRows.push({
          type: 'scone',
          categoryTag: '바 (10개)',
          categoryColorClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20',
          row: barRow,
        });
      }
    } else if (item.category === '미니쉐이크') {
      const shakeRow = combinedMiniShakeRows.find((r) => r.shakeItem.product_name === item.product_name);
      if (shakeRow) {
        unifiedRows.push({
          type: 'shake',
          row: shakeRow,
        });
      }
    }
  });

  // Build oven baking dedicated rows for Triangle & Bar scones (plus Team Separators)
  const ovenBakingRows: OvenBakingRow[] = [];
  items.forEach((item) => {
    if (item.is_separator) {
      ovenBakingRows.push({
        product_name: item.product_name,
        oven_number: '-',
        total_panels: 0,
        full_pans: 0,
        remainder_panels: 0,
        is_separator: true,
      });
    } else if (item.category === '삼각') {
      const triRow = combinedTriangleRows.find((r) => r.sconeItem.product_name === item.product_name);
      if (triRow) {
        const panels = triRow.sconeDoughPanels;
        const info = calculateOvenBakingInfo(panels);
        ovenBakingRows.push({
          product_name: item.product_name,
          oven_number: item.oven_number || '1',
          total_panels: panels,
          full_pans: info.full_pans,
          remainder_panels: info.remainder_panels,
          is_separator: false,
        });
      }
    } else if (item.category === '바') {
      const barRow = combinedBarRows.find((r) => r.sconeItem.product_name === item.product_name);
      if (barRow) {
        const panels = barRow.sconeDoughPanels;
        const info = calculateOvenBakingInfo(panels);
        ovenBakingRows.push({
          product_name: item.product_name,
          oven_number: item.oven_number || '1',
          total_panels: panels,
          full_pans: info.full_pans,
          remainder_panels: info.remainder_panels,
          is_separator: false,
        });
      }
    }
  });

  return {
    combinedTriangleRows,
    combinedBarRows,
    combinedMiniShakeRows,
    unifiedRows,
    ovenBakingRows,
    grandTotalAllPanels,
    halfpackItems,
    miniShakeItems,
    stickItems,
  };
};

export interface OvenBakingRow {
  product_name: string;
  oven_number: string;
  total_panels: number;
  full_pans: number;
  remainder_panels: number;
  is_separator?: boolean;
}

export const calculateOvenBakingInfo = (totalPanels: number) => {
  if (totalPanels <= 0) {
    return { full_pans: 0, remainder_panels: 0 };
  }

  const initialFullPans = Math.floor(totalPanels / 3.0);
  const initialRemainder = roundHalf(totalPanels - (initialFullPans * 3.0));

  if (initialRemainder <= 2.5 && initialFullPans > 1) {
    return {
      full_pans: initialFullPans - 1,
      remainder_panels: roundHalf(initialRemainder + 3.0),
    };
  }

  return {
    full_pans: initialFullPans,
    remainder_panels: initialRemainder,
  };
};

export type UnifiedProductionRow =
  | { type: 'scone'; categoryTag: string; categoryColorClass: string; row: CombinedSconeRow }
  | { type: 'shake'; row: CombinedMiniShakeRow }
  | { type: 'separator'; item: ProductionItem; itemIndex: number };
