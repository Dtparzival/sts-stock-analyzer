/**
 * TWSE/TPEx 官方 API 整合測試
 * 
 * 測試 TWSE/TPEx 官方 OpenAPI 整合模組功能
 */

import { describe, it, expect } from 'vitest';
import {
  fetchTwseCompanyList,
  fetchTwseDailyTrading,
  fetchTpexCompanyList,
  fetchTpexDailyTrading,
  fetchAllTwStockInfo,
  getStockType,
  transformTwseCompany,
  transformTpexCompany,
} from './twseOfficial';

describe('TWSE/TPEx 官方 API 整合', () => {
  describe('股票類型判斷', () => {
    it('應該正確識別 ETF (00 開頭)', () => {
      expect(getStockType('0050')).toBe('etf');
      expect(getStockType('00878')).toBe('etf');
      expect(getStockType('006208')).toBe('etf');
    });

    it('應該正確識別一般股票 (4位數字)', () => {
      expect(getStockType('2330')).toBe('stock');
      expect(getStockType('1101')).toBe('stock');
      expect(getStockType('2454')).toBe('stock');
    });

    it('應該正確識別其他類型', () => {
      expect(getStockType('2330A')).toBe('other');
      expect(getStockType('ABC')).toBe('other');
    });
  });

  // 跳過網路依賴測試 - 這些測試需要實際呼叫外部 API
  // 在 CI/CD 環境中可能會因網路問題而失敗
  describe.skip('TWSE 上市公司資料 (網路依賴)', () => {
    it('應該能夠取得 TWSE 上市公司清單', async () => {
      const companies = await fetchTwseCompanyList();
      expect(companies.length).toBeGreaterThan(0);
      expect(companies.length).toBeGreaterThan(1000);
    }, 60000);

    it('應該能夠取得 TWSE 每日交易資料', async () => {
      const trading = await fetchTwseDailyTrading();
      expect(trading.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe.skip('TPEx 上櫃公司資料 (網路依賴)', () => {
    it('應該能夠取得 TPEx 上櫃公司清單', async () => {
      const companies = await fetchTpexCompanyList();
      expect(companies.length).toBeGreaterThan(0);
      expect(companies.length).toBeGreaterThan(800);
    }, 60000);

    it('應該能夠取得 TPEx 每日交易資料', async () => {
      const trading = await fetchTpexDailyTrading();
      expect(trading.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe.skip('整合同步功能 (網路依賴)', () => {
    it('應該能夠取得所有台股基本資料', async () => {
      const { stocks, stats } = await fetchAllTwStockInfo();
      expect(stocks.length).toBeGreaterThan(0);
      expect(stats.total).toBeGreaterThan(2000);
    }, 120000);
  });

  describe('資料轉換', () => {
    it('應該正確轉換 TWSE 公司資料', () => {
      const mockCompany = {
        出表日期: '1141217',
        公司代號: '2330',
        公司名稱: '台灣積體電路製造股份有限公司',
        公司簡稱: '台積電',
        外國企業註冊地國: '－ ',
        產業別: '24',
        住址: '新竹市新竹科學工業園區力行六路8號',
        營利事業統一編號: '22099131',
        董事長: '魏哲家',
        總經理: '魏哲家',
        發言人: '黃仁昭',
        發言人職稱: '財務長暨發言人',
        代理發言人: '孫又文',
        總機電話: '03-5636688',
        成立日期: '19870221',
        上市日期: '19940905',
        普通股每股面額: '新台幣                 10.0000元',
        實收資本額: '259303804580',
        私募股數: '0',
        特別股: '0',
        編制財務報表類型: '1',
        股票過戶機構: '中國信託商業銀行代理部',
        過戶電話: '66365566',
        過戶地址: '台北市重慶南路一段83號5樓',
        簽證會計師事務所: '勤業眾信聯合會計師事務所',
        簽證會計師1: '曾韻華',
        簽證會計師2: '李佳蓉',
        英文簡稱: 'TSMC',
        英文通訊地址: 'No.8, Li-Hsin Rd. 6, Hsinchu Science Park, Hsinchu, Taiwan, R.O.C.',
        傳真機號碼: '03-5637000',
        電子郵件信箱: 'investor_relations@tsmc.com',
        網址: 'http://www.tsmc.com',
        已發行普通股數或TDR原股發行股數: '25930380458',
      };

      const result = transformTwseCompany(mockCompany);

      expect(result.symbol).toBe('2330');
      expect(result.name).toBe('台灣積體電路製造股份有限公司');
      expect(result.shortName).toBe('台積電');
      expect(result.market).toBe('TWSE');
      expect(result.type).toBe('stock');
      expect(result.industry).toBe('半導體業');
      expect(result.isActive).toBe(true);
    });

    it('應該正確轉換 TPEx 公司資料', () => {
      const mockCompany = {
        Date: '1141217',
        SecuritiesCompanyCode: '6488',
        CompanyName: '環球晶圓股份有限公司',
        CompanyAbbreviation: '環球晶',
        Registration: '－ ',
        SecuritiesIndustryCode: '11',
        Address: '新竹市新竹科學工業園區力行路19號',
        'UnifiedBusinessNo.': '70771579',
        Chairman: '徐秀蘭',
        GeneralManager: '徐秀蘭',
        Spokesman: '劉啟東',
        TitleOfSpokesman: '財務長',
        DeputySpokesperson: '蔡淑惠',
        Telephone: '03-5799988',
        DateOfIncorporation: '20110128',
        DateOfListing: '20160316',
        ParValueOfCommonStock: '新台幣                 10.0000元',
        'Paidin.Capital.NTDollars': '4357291610',
        'PrivateStock.shares': '0',
        'PreferredStock.shares': '0',
        PreparationOfFinancialReportType: '1',
        StockTransferAgent: '元大證券股份有限公司股務代理部',
        StockTransferAgentTelephone: '02-2586-5859',
        StockTransferAgentAddress: '106045台北市大安區敦化南路二段67號地下1樓',
        AccountingFirm: '勤業眾信聯合會計師事務所',
        'CPA.CharteredPublicAccountant.First': '曾韻華',
        'CPA.CharteredPublicAccountant.Second': '李佳蓉',
        Symbol: 'GTSW',
        Fax: '03-5799989',
        EmailAddress: 'investor@gw-semi.com',
        WebAddress: 'http://www.gw-semi.com',
        IssueShares: '435729161',
      };

      const result = transformTpexCompany(mockCompany);

      expect(result.symbol).toBe('6488');
      expect(result.name).toBe('環球晶圓股份有限公司');
      expect(result.shortName).toBe('環球晶');
      expect(result.market).toBe('TPEx');
      expect(result.type).toBe('stock');
      expect(result.industry).toBe('半導體業');
      expect(result.isActive).toBe(true);
    });

    it('應該正確識別 ETF 類型', () => {
      const mockEtfCompany = {
        出表日期: '1141217',
        公司代號: '0050',
        公司名稱: '元大台灣50',
        公司簡稱: '元大台灣50',
        外國企業註冊地國: '－ ',
        產業別: '80',
        住址: '',
        營利事業統一編號: '',
        董事長: '',
        總經理: '',
        發言人: '',
        發言人職稱: '',
        代理發言人: '',
        總機電話: '',
        成立日期: '',
        上市日期: '20030630',
        普通股每股面額: '',
        實收資本額: '',
        私募股數: '',
        特別股: '',
        編制財務報表類型: '',
        股票過戶機構: '',
        過戶電話: '',
        過戶地址: '',
        簽證會計師事務所: '',
        簽證會計師1: '',
        簽證會計師2: '',
        英文簡稱: '',
        英文通訊地址: '',
        傳真機號碼: '',
        電子郵件信箱: '',
        網址: '',
        已發行普通股數或TDR原股發行股數: '',
      };

      const result = transformTwseCompany(mockEtfCompany);

      expect(result.symbol).toBe('0050');
      expect(result.type).toBe('etf');
    });
  });
});
