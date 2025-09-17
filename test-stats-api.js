// 簡單的統計 API 測試腳本
const BASE_URL = 'http://localhost:8787';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n🧪 測試: ${description}`);
    console.log(`📡 請求: GET ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    console.log(`📊 狀態: ${response.status} ${response.statusText}`);
    console.log(`📋 回應:`, JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error(`❌ 錯誤:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 開始測試統計 API...\n');
  
  // 測試健康檢查
  await testAPI('/health', '健康檢查');
  
  // 測試每日統計
  await testAPI('/api/stats/late-reports/daily', '每日遲到統計');
  
  // 測試週報統計
  await testAPI('/api/stats/late-reports/weekly', '週報遲到統計');
  
  // 測試月報統計
  await testAPI('/api/stats/late-reports/monthly', '月報遲到統計');
  
  // 測試用戶統計 (假設用戶 ID 1 存在)
  await testAPI('/api/stats/late-reports/user/1', '用戶 1 的遲到統計');
  
  // 測試清除快取
  console.log(`\n🧪 測試: 清除統計快取`);
  console.log(`📡 請求: POST /api/stats/clear-cache`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/stats/clear-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    console.log(`📊 狀態: ${response.status} ${response.statusText}`);
    console.log(`📋 回應:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`❌ 錯誤:`, error.message);
  }
  
  console.log('\n✅ 測試完成！');
}

// 執行測試
runTests();