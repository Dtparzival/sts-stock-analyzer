import { callDataApi } from "./server/_core/dataApi.js";

async function testStockData() {
  try {
    console.log("Testing stock data API...");
    
    const data = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: "AAPL",
        region: "US",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: true,
        events: "div,split",
      },
    });
    
    console.log("API Response:", JSON.stringify(data, null, 2).substring(0, 1000));
    
    if (data && data.chart && data.chart.result && data.chart.result[0]) {
      console.log("✓ Data structure is correct");
      console.log("Meta:", data.chart.result[0].meta);
    } else {
      console.log("✗ Data structure is incorrect");
      console.log("Received:", data);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testStockData();
