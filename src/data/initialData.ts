import { BrandStrategyData } from '../types/strategy';

export const INITIAL_BRAND_DATA: Record<'mudscone' | 'oatter' | 'wysh', BrandStrategyData> = {
  mudscone: {
    id: 'mudscone',
    name: '머드스콘',
    englishName: 'Mud Scone',
    tagline: '식단 관리의 든든한 동반자, 고단백 식이섬유 시그니처 스콘',
    themeColor: '#8c533e',
    accentColor: '#f97316',
    revenue: {
      year: 2026,
      targetAmount: 5000000000,
      currentAmount: 3240000000,
      unit: '원'
    },
    errcItems: [
      { id: 'ms-e1', title: '정제 설탕 및 정제 밀가루', description: '단순 당분 및 유해 전분 배제', quadrant: 'E' },
      { id: 'ms-e2', title: '인공 방부제', description: '화학 보존료 완전 제거', quadrant: 'E' },
      { id: 'ms-r1', title: '버터 & 지질 함량', description: '지방 및 열량 감소', quadrant: 'R_reduce' },
      { id: 'ms-r2', title: '가격 저항선', description: '생산 효율화로 가격 부담 완화', quadrant: 'R_reduce' },
      { id: 'ms-ra1', title: '고단백 & 식이섬유', description: '단백질 12g, 식이섬유 10g 이상', quadrant: 'R_raise' },
      { id: 'ms-ra2', title: '식감 밀도 & 포만감', description: '묵직한 한 끼 대용 포만감', quadrant: 'R_raise' },
      { id: 'ms-c1', title: '얼먹 레시피 큐레이션', description: '소분 얼먹 조합 서비스', quadrant: 'C' },
      { id: 'ms-c2', title: '구독형 월간 머드 패키지', description: '주간 맞춤 배송 서비스', quadrant: 'C' },
    ],
    factors: [],
    businesses: [
      { id: 'b-ms', name: '머드스콘 (Mud Scone)', color: '#f97316', isSelf: true, lineStyle: 'solid', markerSymbol: 'square' },
      { id: 'b-comp1', name: '일반 베이커리 / 과자점', color: '#94a3b8', isSelf: false, lineStyle: 'dashed', markerSymbol: 'triangle' },
      { id: 'b-comp2', name: '시중 단백질 쉐이크·바', color: '#38bdf8', isSelf: false, lineStyle: 'dotted', markerSymbol: 'diamond' },
    ],
    scores: {
      'b-ms_ms-e1': 5,
      'b-ms_ms-e2': 5,
      'b-ms_ms-r1': 4,
      'b-ms_ms-r2': 3,
      'b-ms_ms-ra1': 5,
      'b-ms_ms-ra2': 5,
      'b-ms_ms-c1': 5,
      'b-ms_ms-c2': 4.5,

      'b-comp1_ms-e1': 1,
      'b-comp1_ms-e2': 1,
      'b-comp1_ms-r1': 1.5,
      'b-comp1_ms-r2': 4,
      'b-comp1_ms-ra1': 1,
      'b-comp1_ms-ra2': 2.5,
      'b-comp1_ms-c1': 1,
      'b-comp1_ms-c2': 1,

      'b-comp2_ms-e1': 3,
      'b-comp2_ms-e2': 2.5,
      'b-comp2_ms-r1': 3,
      'b-comp2_ms-r2': 3.5,
      'b-comp2_ms-ra1': 4.5,
      'b-comp2_ms-ra2': 2,
      'b-comp2_ms-c1': 1.5,
      'b-comp2_ms-c2': 2.5,
    }
  },
  oatter: {
    id: 'oatter',
    name: '오터',
    englishName: 'Oatter',
    tagline: '귀리(Oat)로 여는 아침, 슈퍼푸드 온더고 라이프',
    themeColor: '#ca8a04',
    accentColor: '#eab308',
    revenue: {
      year: 2026,
      targetAmount: 2000000000,
      currentAmount: 1150000000,
      unit: '원'
    },
    errcItems: [
      { id: 'oa-e1', title: '동물성 유제품 배제', description: '100% 락토프리', quadrant: 'E' },
      { id: 'oa-r1', title: '조리 준비 시간', description: '간편 섭취 형태로 조리 최소화', quadrant: 'R_reduce' },
      { id: 'oa-r2', title: '오트밀 호불호 풍미', description: '고소하고 세련된 맛 기술', quadrant: 'R_reduce' },
      { id: 'oa-ra1', title: '베타글루칸 영양 함량', description: '식이섬유 스펙 강화', quadrant: 'R_raise' },
      { id: 'oa-c1', title: 'Z세대 힙스터 오트 디저트', description: '토핑 오버나이트 키트', quadrant: 'C' },
    ],
    factors: [],
    businesses: [
      { id: 'bo-ot', name: '오터 (Oatter)', color: '#eab308', isSelf: true, lineStyle: 'solid', markerSymbol: 'square' },
      { id: 'bo-trad', name: '전통 오트밀 수입 브랜드', color: '#64748b', isSelf: false, lineStyle: 'dashed', markerSymbol: 'triangle' },
      { id: 'bo-cereal', name: '시중 그래놀라/시리얼', color: '#a855f7', isSelf: false, lineStyle: 'dotted', markerSymbol: 'circle' },
    ],
    scores: {
      'bo-ot_oa-e1': 5,
      'bo-ot_oa-r1': 4.5,
      'bo-ot_oa-r2': 4.8,
      'bo-ot_oa-ra1': 4.5,
      'bo-ot_oa-c1': 5,

      'bo-trad_oa-e1': 4,
      'bo-trad_oa-r1': 2,
      'bo-trad_oa-r2': 2.5,
      'bo-trad_oa-ra1': 4.5,
      'bo-trad_oa-c1': 1.5,

      'bo-cereal_oa-e1': 2,
      'bo-cereal_oa-r1': 4.5,
      'bo-cereal_oa-r2': 4,
      'bo-cereal_oa-ra1': 2.5,
      'bo-cereal_oa-c1': 3,
    }
  },
  wysh: {
    id: 'wysh',
    name: '위시',
    englishName: 'Wysh',
    tagline: '당신만을 위한 맞춤 웰니스 솔루션 & 인너뷰티',
    themeColor: '#16a34a',
    accentColor: '#22c55e',
    revenue: {
      year: 2026,
      targetAmount: 3000000000,
      currentAmount: 1820000000,
      unit: '원'
    },
    errcItems: [
      { id: 'wy-e1', title: '불필요한 알약 갯수', description: '과대 캡슐 섭취 배제', quadrant: 'E' },
      { id: 'wy-r1', title: '유통 마진 거품', description: 'D2C 유통으로 가격 절감', quadrant: 'R_reduce' },
      { id: 'wy-ra1', title: '1:1 맞춤 진단', description: '데이터 기반 바이오 솔루션', quadrant: 'R_raise' },
      { id: 'wy-c1', title: '데일리 바이오스케줄러 앱', description: '섭취 타이머 앱 서비스', quadrant: 'C' },
    ],
    factors: [],
    businesses: [
      { id: 'bw-wy', name: '위시 (Wysh)', color: '#22c55e', isSelf: true, lineStyle: 'solid', markerSymbol: 'square' },
      { id: 'bw-pharm', name: '일반 약국 제약 브랜드', color: '#94a3b8', isSelf: false, lineStyle: 'dashed', markerSymbol: 'triangle' },
      { id: 'bw-sub', name: '일반 건강기능식품 구독', color: '#ec4899', isSelf: false, lineStyle: 'dotted', markerSymbol: 'diamond' },
    ],
    scores: {
      'bw-wy_wy-e1': 4.8,
      'bw-wy_wy-r1': 4.2,
      'bw-wy_wy-ra1': 4.9,
      'bw-wy_wy-c1': 4.7,

      'bw-pharm_wy-e1': 1.5,
      'bw-pharm_wy-r1': 1.8,
      'bw-pharm_wy-ra1': 2.0,
      'bw-pharm_wy-c1': 1.0,

      'bw-sub_wy-e1': 3.0,
      'bw-sub_wy-r1': 3.5,
      'bw-sub_wy-ra1': 3.8,
      'bw-sub_wy-c1': 2.5,
    }
  }
};
