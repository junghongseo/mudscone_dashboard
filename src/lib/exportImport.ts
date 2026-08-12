import { BrandStrategyData } from '../types/strategy';

export const exportDashboardDataJSON = (data: Record<string, BrandStrategyData>) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `MudScone_Strategy_Backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importDashboardDataJSON = (file: File): Promise<Record<string, BrandStrategyData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json);
      } catch (err) {
        reject(new Error("유효하지 않은 JSON 파일 형식입니다."));
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsText(file);
  });
};
