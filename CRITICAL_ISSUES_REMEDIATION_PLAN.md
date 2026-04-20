# CRITICAL 8건 상세 수정 계획안

**작성일:** 2026-02-23  
**기반 문서:** LEGAL_COMPLIANCE_REPORT.md  
**목적:** CRITICAL 등급 8건에 대한 구체적 수정 방법, 영향 범위, 코드 변경사항, 검증 방법을 포함한 실행 가능한 수정 계획

---

## 목차

1. [CRITICAL-1] Super Rate 불일치 (11.5% vs 12%)
2. [CRITICAL-2] Privacy Policy 미비
3. [CRITICAL-3] 해외 데이터 전송 미고지
4. [CRITICAL-4] 세무사법 적용 가능성
5. [CRITICAL-5] AdSense 정책 미준수
6. [CRITICAL-6] 보안 감사 미실시
7. [CRITICAL-7] Cookie 동의 미구현
8. [CRITICAL-8] 준거법 미지정

---

## CRITICAL-1. Super Rate 불일치 (11.5% vs 12%)

### 현재 상태

**두 개의 상충하는 상수가 코드베이스에 존재:**

| 위치 | 상수명 | 값 | 사용처 |
|------|--------|-----|--------|
| `src/store/useScheduleStore.ts:293` | `SUPER_RATE` | `0.115` (11.5%) | ExportModal, exportUtils |
| `src/data/taxRates/australia.ts:40` | `AU_SUPER_RATE` | `0.12` (12%) | TaxCalculator, PaySummaryCards |
| `src/data/taxRates/index.ts:23` | `SUPER_RATE` (= AU_SUPER_RATE) | `0.12` (12%) | 미사용 (store의 동명 export에 의해 shadowing) |

**영향 받는 파일 체인:**
```
useScheduleStore.ts (SUPER_RATE = 0.115)
  └─> ExportModal.tsx (line 5: import { SUPER_RATE } from '../../store/useScheduleStore')
      └─> 미리보기의 Super 금액 = totalPay * 0.115 (잘못됨)
  └─> exportUtils.ts (line 11: import { SUPER_RATE } from '../store/useScheduleStore')
      └─> CSV의 Super 컬럼 = pay * 0.115 (잘못됨)
      └─> PDF의 Total Super 라벨 = "Total Super (11.5%)" (잘못됨)
      └─> PDF의 Super 금액 = pay * 0.115 (잘못됨)
```

**반면, 세금 계산기 경로는 정확함:**
```
australia.ts (AU_SUPER_RATE = 0.12)
  └─> createAustralianCalculator().getRetirementRate() → 0.12
  └─> PaySummaryCards.tsx → 올바른 12% 표시
```

### 수정 방안

#### Step 1: `useScheduleStore.ts`에서 잘못된 상수 제거

**파일:** `src/store/useScheduleStore.ts`

```diff
- export const SUPER_RATE = 0.115;
```

이 한 줄을 삭제합니다. `getWageConfigFromJobConfigs` 함수 아래에 있는 마지막 줄입니다.

#### Step 2: `ExportModal.tsx` import 변경

**파일:** `src/components/Export/ExportModal.tsx`

```diff
- import { useScheduleStore, SUPER_RATE } from '../../store/useScheduleStore';
+ import { useScheduleStore } from '../../store/useScheduleStore';
+ import { AU_SUPER_RATE } from '../../data/taxRates/australia';
```

```diff
- return { totalHours, totalPay, totalSuper: totalPay * SUPER_RATE, shiftCount: filteredShifts.length };
+ return { totalHours, totalPay, totalSuper: totalPay * AU_SUPER_RATE, shiftCount: filteredShifts.length };
```

#### Step 3: `exportUtils.ts` import 변경

**파일:** `src/utils/exportUtils.ts`

```diff
- import { SUPER_RATE } from '../store/useScheduleStore';
+ import { AU_SUPER_RATE } from '../data/taxRates/australia';
```

```diff
- Super: (pay * SUPER_RATE).toFixed(2),
+ Super: (pay * AU_SUPER_RATE).toFixed(2),
```

```diff
- grandTotalSuper += pay * SUPER_RATE;
+ grandTotalSuper += pay * AU_SUPER_RATE;
```

```diff
- doc.text('Total Super (11.5%):', 20, yPos);
+ doc.text(`Total Super (${(AU_SUPER_RATE * 100).toFixed(0)}%):`, 20, yPos);
```

#### Step 4: `taxRates/index.ts`의 SUPER_RATE 재수출도 정리

**파일:** `src/data/taxRates/index.ts` - 이미 `AU_SUPER_RATE`를 올바르게 재수출하고 있으므로 변경 불필요. 다만 이 파일의 `SUPER_RATE` alias는 더 이상 store와 충돌하지 않으므로 유지 가능.

#### Step 5: 단위 테스트 추가

```typescript
// src/__tests__/superRateConsistency.test.ts
import { AU_SUPER_RATE } from '../data/taxRates/australia';

describe('Super Rate Consistency', () => {
  it('should be 12% for FY 2025-26', () => {
    expect(AU_SUPER_RATE).toBe(0.12);
  });

  it('should NOT have any hardcoded 0.115 references', async () => {
    // This test serves as a code-level guard
    // The CI pipeline's grep check will also catch this
    expect(AU_SUPER_RATE).not.toBe(0.115);
  });
});
```

### 검증 방법
1. `npm run test` 전체 테스트 통과
2. `grep -rn "0\.115" src/` - 결과 없어야 함
3. Export Modal에서 Super 금액이 12%로 표시되는지 수동 확인
4. CSV/PDF 내보내기에서 Super 금액이 12%로 계산되는지 확인

### 예상 소요 시간: 1시간

### 위험도: 낮음 (단순 상수 변경)

---

## CRITICAL-2. Privacy Policy 미비

### 현재 상태

**파일:** `public/privacy-policy.html`

현재 개인정보처리방침의 문제점:

| 항목 | 현재 상태 | 필요 사항 |
|------|-----------|-----------|
| 운영 주체 | 미표시 | 법인/개인 명시 필요 |
| 수집 데이터 | "Account identifiers" 등 모호한 표현 | 구체적 데이터 필드 목록 필요 |
| 제3자 제공자 | "third-party services" 일반 언급만 | Supabase, Google Gemini, Google AdSense, Vercel 명시 |
| 해외 전송 | 미언급 | APP 8 준수를 위한 해외 전송 고지 |
| 보존 기간 | "as needed" | 구체적 기간 명시 |
| 쿠키 정보 | 미언급 | localStorage, AdSense 쿠키 고지 |
| 삭제 절차 | "You may request" | 구체적 절차와 기한(30일) |
| 아동 보호 | 미언급 | 최소 연령(16세) 명시 |
| 데이터 침해 통지 | 미언급 | NDB Scheme 준수 약속 |
| APP 준수 선언 | 미언급 | 13개 APPs 준수 프레임워크 |

### 수정 방안

#### Privacy Policy 전면 재작성

**파일:** `public/privacy-policy.html`

새로운 Privacy Policy에 반드시 포함해야 할 섹션:

```
1. 개요 및 운영 주체
   - PayChecker 운영 주체(법인/개인) 및 연락처
   - 본 방침의 적용 범위

2. 수집 데이터 인벤토리 (표 형식)
   ┌────────────────┬───────────────────────────────┬──────────────┬────────────────┐
   │ 데이터 카테고리 │ 구체적 데이터 필드              │ 수집 목적     │ 보존 기간       │
   ├────────────────┼───────────────────────────────┼──────────────┼────────────────┤
   │ 계정 정보       │ 이메일, 비밀번호 해시, 사용자 ID │ 인증          │ 계정 유지 + 6개월│
   │ 프로필          │ 비자 유형, 국가, 관리자 플래그   │ 서비스 개인화  │ 계정 유지 기간   │
   │ 고용 정보       │ 직장명, 시급, 근무 시간         │ 핵심 서비스    │ 계정 유지 기간   │
   │ 재무 정보       │ 소득 추정, 세금 계산, 지출       │ 핵심 서비스    │ 계정 유지 기간   │
   │ 로스터 이미지   │ 업로드된 PDF/이미지             │ AI 추출       │ 처리 후 즉시 삭제│
   │ 로스터 결과     │ 파싱된 시프트 데이터, OCR 결과   │ 서비스 기록    │ 12개월          │
   │ 피드백          │ 메시지, 이메일, 답변            │ 고객 지원      │ 24개월          │
   │ 기술 로그       │ IP(익명화), 브라우저, 타임스탬프  │ 안정성 확보    │ 90일            │
   └────────────────┴───────────────────────────────┴──────────────┴────────────────┘

3. 데이터 사용 방법
   - 핵심 서비스 제공 (시프트 추적, 급여 추정, 내보내기)
   - 서비스 신뢰성 및 성능 개선
   - 보안 제어 및 남용 방지

4. 제3자 데이터 처리자 (명시적 목록)
   ┌──────────────────┬──────────┬──────────────────────────────────────┐
   │ 처리자            │ 소재지   │ 처리 내용                             │
   ├──────────────────┼──────────┼──────────────────────────────────────┤
   │ Supabase Inc.    │ 미국     │ 데이터베이스, 인증, 엣지 함수 실행      │
   │ Google LLC       │ 미국     │ Gemini AI (로스터 OCR), AdSense (광고) │
   │ Vercel Inc.      │ 미국     │ 웹 호스팅 및 CDN                      │
   └──────────────────┴──────────┴──────────────────────────────────────┘

5. 해외 데이터 전송 (APP 8) → CRITICAL-3과 연계
   - 전송 대상국 및 수신자 목록
   - 보호 조치 (계약적 보호 또는 명시적 동의)

6. 쿠키 및 로컬 저장소
   - localStorage: paychecker-storage-v2 (필수 - 앱 상태)
   - Supabase 인증 쿠키 (필수 - 인증)
   - Google AdSense 쿠키 (광고 - 비필수, 동의 필요)

7. 데이터 보존 및 삭제
   - 각 카테고리별 구체적 보존 기간
   - 삭제 요청 절차 (최대 30일 내 처리)
   - 자동 데이터 정리 프로세스

8. 사용자의 권리
   - 접근권 (Access)
   - 정정권 (Correction)
   - 삭제권 (Erasure) - 구체적 절차 명시
   - 데이터 이동권 (Portability) - CSV/PDF 내보내기
   - 불만 제기 (OAIC 연락처 포함)

9. 아동 보호
   - 최소 이용 연령: 16세
   - 미성년자 데이터 수집 금지

10. 데이터 침해 통지
    - Notifiable Data Breaches (NDB) Scheme 준수
    - 30일 이내 OAIC 및 이용자 통지

11. AI 처리 고지
    - 로스터 이미지가 Google Gemini API로 전송되어 처리됨을 명시
    - 타인의 개인정보가 포함될 수 있음을 경고
    - Google의 데이터 처리 약관 참조

12. GDPR 준수 (EU 사용자 해당)
    - 처리의 법적 근거
    - EU 사용자의 추가 권리

13. 정책 변경
    - 변경 시 사전 고지 방법
    - 최종 업데이트 날짜 표시

14. 연락처
    - 실제 수신 가능한 이메일 주소
    - OAIC 불만 제기 링크
```

### 구현 순서

1. **HTML 구조 설계** (1일)
   - 기존 스타일 유지하면서 섹션 확장
   - 표(table) 형식으로 데이터 인벤토리 구현
   - 반응형 디자인 확인

2. **내용 작성** (2일)
   - 영어 원문 작성 (법률적 정확성 우선)
   - owner 확인 필요 사항 표시 ([ ] 플레이스홀더)
   - 법률 자문 전 드래프트 완성

3. **연관 페이지 업데이트** (0.5일)
   - about.html에서 Privacy Policy 링크 확인
   - contact.html에서 삭제 요청 절차 추가
   - sitemap.xml 업데이트 불필요 (기존 URL 유지)

### Owner 결정 필요 사항
- [ ] 운영 주체 (개인명/법인명/ABN)
- [ ] 최소 이용 연령 (16세 vs 13세)
- [ ] 데이터 보존 기간 최종 확정
- [ ] 실제 작동하는 연락처 이메일

### 예상 소요 시간: 3-5일 (법률 검토 별도)

### 위험도: 높음 (법적 문서이므로 전문가 검토 권장)

---

## CRITICAL-3. 해외 데이터 전송 미고지 (APP 8)

### 현재 상태

사용자 데이터가 다음 해외 서비스로 전송되고 있으나 어디에도 고지되지 않음:

| 서비스 | 전송 데이터 | 전송 경로 | 코드 위치 |
|--------|------------|-----------|-----------|
| **Supabase** (미국/AWS) | 전체 사용자 데이터 (프로필, 시프트, 직무, 피드백) | `supabaseClient.ts` → Supabase REST API | 모든 데이터 CRUD 작업 |
| **Google Gemini** (미국) | 로스터 이미지 (Base64), OCR 결과 | Edge Function → Gemini API | `supabase/functions/process-roster/gemini.ts` |
| **Google AdSense** (미국) | 브라우저 핑거프린팅, 쿠키, 행동 데이터 | `index.html` 스크립트 로드 | `index.html:27`, `GoogleAd.tsx` |
| **Vercel** (미국) | 모든 HTTP 트래픽, IP 주소 | 호스팅 인프라 | 배포 설정 |

**APP 8 (Australian Privacy Principle 8) 요구사항:**
> 해외 수신자에게 개인정보를 전송하기 전에, (a) 수신자가 APPs를 준수하도록 합리적인 조치를 취하거나, (b) 개인으로부터 명시적이고 정보에 입각한 동의를 받아야 합니다.

### 수정 방안

#### Step 1: Privacy Policy에 해외 전송 섹션 추가

CRITICAL-2의 Privacy Policy 재작성 시 다음 섹션을 포함:

```html
<h2>5. Cross-Border Data Transfers</h2>
<p>PayChecker uses service providers located outside Australia to operate the service. 
Your personal information may be transferred to, and processed in, the following countries:</p>

<table>
  <thead>
    <tr>
      <th>Service Provider</th>
      <th>Country</th>
      <th>Data Transferred</th>
      <th>Purpose</th>
      <th>Safeguards</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Supabase Inc.</td>
      <td>United States</td>
      <td>Account data, shift records, job configurations, feedback</td>
      <td>Database hosting, authentication</td>
      <td>Industry-standard security (SOC 2), encryption at rest and in transit</td>
    </tr>
    <tr>
      <td>Google LLC (Gemini AI)</td>
      <td>United States</td>
      <td>Uploaded roster images</td>
      <td>AI-powered text extraction from roster images</td>
      <td>Google Cloud Terms of Service, data processing agreement</td>
    </tr>
    <tr>
      <td>Google LLC (AdSense)</td>
      <td>United States</td>
      <td>Browser information, cookies</td>
      <td>Displaying advertisements</td>
      <td>Google Privacy Policy, EU-US Data Privacy Framework</td>
    </tr>
    <tr>
      <td>Vercel Inc.</td>
      <td>United States</td>
      <td>HTTP request data, IP addresses</td>
      <td>Web hosting and content delivery</td>
      <td>Vercel Privacy Policy, TLS encryption</td>
    </tr>
  </tbody>
</table>

<p>By using PayChecker, you explicitly consent to the transfer of your personal 
information to these overseas recipients. [법률 자문 후 동의 메커니즘 구체화]</p>
```

#### Step 2: 로스터 업로드 시 AI 전송 경고

**파일:** 로스터 스캔 관련 컴포넌트

업로드 전에 다음 경고 표시:

```
⚠️ AI Processing Notice
Your uploaded roster image will be sent to Google's servers in the United States 
for text extraction. This may include personal information of other employees 
visible in the roster.

By uploading, you confirm:
- You have authorization to share this workplace document
- You understand the image will be processed by a third-party AI service
- Other people's data visible in the image will be temporarily processed

[✓ I understand and consent to AI processing]  [Upload] [Cancel]
```

#### Step 3: 가입 시 해외 전송 동의 획득

**파일:** `src/components/Auth/Auth.tsx`

가입 화면에 추가:

```
[✓] I agree to the Terms of Service and Privacy Policy, including the 
    transfer of my data to service providers in the United States.
```

동의 타임스탬프를 프로필에 저장:
```sql
ALTER TABLE profiles ADD COLUMN consent_given_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN consent_version TEXT;
```

#### Step 4: DPA (Data Processing Agreement) 확보

각 서비스 제공자와의 데이터 처리 계약 확인:
- [ ] Supabase DPA (https://supabase.com/legal/dpa)
- [ ] Google Cloud DPA (자동 적용)
- [ ] Vercel DPA (https://vercel.com/legal/dpa)

### 검증 방법
1. Privacy Policy에서 해외 전송 섹션 확인
2. 로스터 업로드 전 경고 표시 확인
3. 가입 시 동의 체크박스 작동 확인
4. DPA 문서 보관 확인

### 예상 소요 시간: 2-3일 (DPA 확인은 별도)

### 위험도: 중간 (법률 문서 + 코드 변경)

---

## CRITICAL-4. 세무사법 (Tax Agent Services Act 2009) 적용 가능성

### 현재 상태

**핵심 문제:** PayChecker는 ATO의 공식 세율표와 PAYG 원천징수 계수를 사용하여 개인별 세금을 계산하고, 이 기능과 함께 AdSense 광고로 상업적 수익을 얻고 있습니다.

**현재 세금 계산 코드 위치:**
```
src/data/taxRates/australia.ts
  ├─ ATO 2025-26 세율표 (AU_TAX_BRACKETS)
  ├─ PAYG 원천징수 계수 (PAYG_SCALE_2, PAYG_SCALE_6, PAYG_SCHEDULE_15)
  ├─ Medicare Levy 계산 (calculateMedicareLevyForVisa)
  ├─ Working Holiday Maker 세율 (AU_WHM_TAX_BRACKETS)
  └─ 종합 세금 계산 (calculateTakeHomeForVisa)

src/data/taxRates/korea.ts
  └─ 한국 2024년 세율 (비활성 상태이나 코드 존재)
```

**세무사법 관련 리스크:**
- Tax Agent Services Act 2009 Section 50-5: 등록 없이 유료로(또는 상업적 활동과 관련하여) "세무 대리 서비스"를 제공하는 것은 위법
- "세무 대리 서비스"에는 세법을 특정 상황에 적용하는 것이 포함됨
- PayChecker는 개별 사용자의 소득에 ATO 세율을 적용 = 잠재적으로 세무 대리 서비스에 해당

### 수정 방안

#### 단계 A: 즉시 조치 (코드 변경)

##### A-1. 모든 세금 관련 화면에 면책 조항 추가

새로운 재사용 가능 컴포넌트 생성:

**파일:** `src/components/Disclaimer/TaxDisclaimer.tsx` (NEW)

```tsx
export const TaxDisclaimer = ({ variant = 'inline' }: { variant?: 'inline' | 'tooltip' | 'banner' }) => {
  const text = "Estimates only - not tax, financial, or legal advice. " +
    "PayChecker is not a registered tax agent. " +
    "Always verify with your payslip, employer, or a registered tax agent.";
  
  // ... variant별 렌더링
};
```

삽입 위치:
- `Dashboard.tsx` - 월간 요약 카드 아래
- `PaySummaryCards.tsx` - 세금/Super 카드에 Info 아이콘
- `FiscalYearView.tsx` (있다면) - YTD 소득/세금 섹션 아래
- `ExportModal.tsx` - 미리보기 섹션 아래
- CSV/PDF 내보내기 파일 내 - 면책 조항 텍스트 삽입

##### A-2. Export 파일에 면책 조항 포함

**파일:** `src/utils/exportUtils.ts`

CSV에 면책 조항 행 추가:
```typescript
// After totals row, add disclaimer
rows.push({
  Date: '', Day: '', DayType: '', JobType: '', Hours: 0,
  Pay: 'DISCLAIMER: Estimates only. Not tax advice. Verify with a registered tax agent.',
  Super: '',
});
```

PDF에 면책 조항 푸터 추가:
```typescript
// On every page footer
doc.setFontSize(7);
doc.setTextColor(120);
doc.text(
  'DISCLAIMER: Generated by PayChecker. Estimates only - not official payroll or tax records. ' +
  'Verify all amounts with your employer and a registered tax agent. ' +
  'Tax rates based on ATO 2025-26 FY data. PayChecker is not a registered tax agent.',
  pageWidth / 2, 282, { align: 'center', maxWidth: pageWidth - 28 }
);
```

##### A-3. 마케팅 문구 수정

| 현재 문구 | 수정 후 |
|-----------|---------|
| "Accurate Pay Calculations" | "Pay Estimation Tools" |
| "정확한 급여 계산" | "급여 예상 도구" |
| "Real-time tax estimates based on current ATO brackets" | "Tax withholding estimates for planning purposes" |
| "Tax Made Easy" | "Tax Estimation for Planning" |
| "australia pay calculator" (SEO keyword) | "australia pay estimation tool" |

##### A-4. 세금 계산 기능의 용어 변경

UI 전반에서:
- "Tax" → "Est. Tax" 또는 "Tax (est.)"
- "Net Pay" → "Est. Net Pay"
- "Income Tax" → "Est. Income Tax"
- "Super" → "Est. Super"

i18n 키 업데이트:
```json
{
  "dashboard.estimatedPay": "Est. Pay",
  "dashboard.estimatedTax": "Est. Tax (approx.)",
  "dashboard.estimatedNetPay": "Est. Net Pay",
  "dashboard.taxDisclaimer": "Estimates only. Not tax advice."
}
```

#### 단계 B: 외부 법률 자문 (필수)

1. **세법 전문 변호사 의뢰**
   - 질문 1: PayChecker가 "tax agent service"에 해당하는가?
   - 질문 2: Tax Practitioners Board 등록이 필요한가?
   - 질문 3: 현재의 면책 조항으로 충분한가?
   - 질문 4: 어떤 변경이 규제 리스크를 줄일 수 있는가?
   
2. **예상 비용:** AUD $2,000 - $5,000
3. **소요 기간:** 2-3주

#### 단계 C: 법률 의견에 따른 후속 조치

가능한 시나리오:
- **시나리오 1:** "해당하지 않음" → 면책 조항 유지, 문서화
- **시나리오 2:** "회색 영역" → 면책 조항 강화, "교육적 추정치" 라벨링
- **시나리오 3:** "해당함" → TPB 등록 필요 또는 세금 계산 기능 축소/제거

### 검증 방법
1. 모든 세금 관련 화면에 면책 조항 표시 확인
2. Export 파일(CSV/PDF)에 면책 조항 포함 확인
3. 마케팅 문구에서 "정확한"/"accurate" 단어 제거 확인
4. 법률 의견서 수령 확인

### 예상 소요 시간
- 단계 A (코드 변경): 2-3일
- 단계 B (법률 자문): 2-3주
- 단계 C (후속 조치): 법률 의견에 따라 결정

### 위험도: 매우 높음 (법적 결과 가능)

---

## CRITICAL-5. AdSense 정책 미준수

### 현재 상태

**AdSense 구현:**
- Publisher ID: `ca-pub-4516626856296531`
- `ads.txt`: `google.com, pub-4516626856296531, DIRECT, f08c47fec0942fa0`
- 스크립트 로드: `index.html:27` (무조건 로드, 동의 없이)
- 광고 표시: `GoogleAd.tsx` → `App.tsx:217`

**위반 사항:**

| Google AdSense 정책 | 현재 상태 | 필요 조치 |
|---------------------|-----------|-----------|
| EU User Consent Policy | 미구현 | CMP(Consent Management Platform) 필요 |
| Privacy Policy 요구 | 있으나 미흡 | CRITICAL-2에서 보완 |
| 쿠키 동의 | 미구현 | CRITICAL-7에서 구현 |
| Better Ads Standards | 미검증 | 광고 배치 검증 필요 |
| 금융 서비스 콘텐츠 | 미검토 | 세금 계산 페이지의 민감 카테고리 검토 |
| 광고 라벨링 | `aria-label="Advertisement"` 존재 | 시각적 "Advertisement" 라벨도 존재 (OK) |

### 수정 방안

#### Step 1: AdSense 스크립트 조건부 로드 (CRITICAL-7과 연계)

**현재 `index.html`:**
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4516626856296531"
 crossorigin="anonymous"></script>
```

**수정 후 `index.html`:**
```html
<!-- AdSense script removed from static HTML - now loaded dynamically based on cookie consent -->
```

AdSense 스크립트를 `index.html`에서 제거하고, 쿠키 동의 후 동적으로 로드:

**새 파일:** `src/utils/adSenseLoader.ts`

```typescript
let loaded = false;

export function loadAdSense(): void {
  if (loaded) return;
  
  const script = document.createElement('script');
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4516626856296531';
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  
  loaded = true;
}

export function isAdSenseLoaded(): boolean {
  return loaded;
}
```

#### Step 2: GoogleAd 컴포넌트에 동의 확인 추가

**파일:** `src/components/GoogleAd.tsx`

```typescript
import { getConsentStatus } from '../utils/cookieConsent';

export const GoogleAd: React.FC<GoogleAdProps> = (props) => {
  const hasAdConsent = getConsentStatus('advertising');
  
  if (!hasAdConsent) {
    return null; // 동의 없으면 광고 표시하지 않음
  }
  
  // ... 기존 광고 렌더링 로직
};
```

#### Step 3: Google의 EU Consent Mode 구현

```typescript
// src/utils/googleConsent.ts
export function initGoogleConsentMode() {
  window.gtag?.('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
  });
}

export function updateGoogleConsent(granted: boolean) {
  window.gtag?.('consent', 'update', {
    'ad_storage': granted ? 'granted' : 'denied',
    'ad_user_data': granted ? 'granted' : 'denied',
    'ad_personalization': granted ? 'granted' : 'denied',
  });
}
```

#### Step 4: 금융 서비스 콘텐츠 정책 검토

Google AdSense의 "금융 서비스" 관련 제한 사항:
- 세금 계산이 표시되는 페이지에서 광고가 "금융 상품" 광고로 오인될 수 있는지 검토
- 필요 시 특정 페이지에서 광고 표시 제한

### 검증 방법
1. 쿠키 동의 전에 AdSense 스크립트가 로드되지 않는지 확인
2. 동의 후에만 광고가 표시되는지 확인
3. Google AdSense 대시보드에서 정책 위반 경고 없는지 확인
4. EU 위치에서 접속 시 Consent Mode가 작동하는지 확인

### 예상 소요 시간: 2-3일 (CRITICAL-7과 병행)

### 위험도: 중간 (AdSense 계정 정지 가능)

---

## CRITICAL-6. 보안 감사 미실시

### 현재 상태

**현재 보안 조치:**
- CI 파이프라인: `npm audit --omit=dev --audit-level=high`
- `dangerouslySetInnerHTML` 사용 금지 검사: `npm run check:no-danger`
- Supabase RLS(Row Level Security): 모든 테이블에 활성화
- CORS: 허용 도메인 목록 기반 (but 와일드카드 문제 있음)
- 인증: Supabase Auth + Bearer Token

**미실시 항목:**

| 보안 영역 | 현재 상태 | 리스크 |
|-----------|-----------|--------|
| OWASP Top 10 검토 | 미실시 | XSS, Injection, SSRF 등 |
| 침투 테스트 | 미실시 | Edge Function 취약점 |
| CSP (Content Security Policy) | 미설정 | XSS 방어 없음 |
| HSTS | 미설정 (Vercel 기본값에 의존) | 다운그레이드 공격 |
| CORS 와일드카드 | `hostname.includes('paychecker')` 패턴 | 유사 도메인 위조 가능 |
| RLS 감사 | 미실시 | 권한 상승 가능성 |
| Health endpoint | 설정 정보 노출 | 정찰 공격 지원 |
| 의존성 취약점 | CI 기본 감사만 | 중간 심각도 이하 누락 |

### 수정 방안

#### Phase 1: 즉시 조치 (코드 변경)

##### 1-A. Content Security Policy 헤더 설정

**파일:** `vercel.json` (NEW)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://pagead2.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.googlesyndication.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://*.google.com https://*.googleusercontent.com https://*.googlesyndication.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://pagead2.googlesyndication.com https://generativelanguage.googleapis.com; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.google.com; font-src 'self' data:;"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        }
      ]
    }
  ]
}
```

##### 1-B. CORS 정책 강화

**파일:** `supabase/functions/process-roster/index.ts`

```diff
  function isAllowedOrigin(origin: string): boolean {
    if (getAllowedOrigins().includes(origin)) return true;
-   // Allow Vercel preview deployments
-   try {
-     const url = new URL(origin);
-     if (url.hostname.endsWith('.vercel.app') && url.hostname.includes('paychecker')) return true;
-   } catch { /* ignore invalid URLs */ }
    return false;
  }
```

와일드카드 매칭 제거. preview deployment URL은 `ALLOWED_ORIGINS` 환경변수를 통해서만 허용.

##### 1-C. Health endpoint 정보 노출 축소

**파일:** `supabase/functions/process-roster/index.ts`

```diff
  if (req.method === 'GET') {
-   const supabaseUrl = Deno.env.get('SUPABASE_URL');
-   const hasServiceKey = Boolean(
-     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')
-   );
    return json(200, {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
-     config: {
-       hasSupabaseUrl: Boolean(supabaseUrl),
-       hasServiceRoleKey: hasServiceKey,
-       hasGeminiKey: Boolean(Deno.env.get('GEMINI_API_KEY')),
-     },
    });
  }
```

프로덕션에서 서비스 설정 정보를 외부에 노출하지 않습니다.

##### 1-D. RLS 보안 강화 - Admin 권한 상승 방지

```sql
-- is_admin 필드를 사용자가 직접 변경할 수 없도록 방지
-- 기존 UPDATE 정책에 추가 제약 조건
CREATE POLICY "prevent_admin_self_escalation" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  CASE 
    WHEN is_admin IS DISTINCT FROM (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid())
    THEN false  -- is_admin 변경 시도 시 차단
    ELSE true
  END
);
```

#### Phase 2: 체계적 보안 감사 (1-2주)

##### 2-A. OWASP Top 10 체크리스트

| # | OWASP 항목 | PayChecker 해당 여부 | 검토 항목 |
|---|-----------|---------------------|-----------|
| A01 | Broken Access Control | ✅ | RLS 정책 전체 검증, userId 필터 bypas 가능성 |
| A02 | Cryptographic Failures | ⚠️ | Supabase 기본 암호화, 민감 데이터 암호화 여부 |
| A03 | Injection | ✅ | Edge Function 입력 검증, SQL injection (Supabase가 방어) |
| A04 | Insecure Design | ⚠️ | 비밀번호 정책, 세션 관리 (Supabase Auth) |
| A05 | Security Misconfiguration | ✅ | CSP, CORS, 에러 메시지, 디버그 정보 |
| A06 | Vulnerable Components | ✅ | npm audit, 의존성 취약점 |
| A07 | Auth Failures | ⚠️ | 토큰 관리, 세션 타임아웃 |
| A08 | Software Integrity | ⚠️ | CI/CD 파이프라인 보안, SRI |
| A09 | Security Logging | ⚠️ | Edge Function 로깅, 이상 탐지 |
| A10 | Server-Side Request Forgery | ✅ | Gemini API 호출 (Base64 이미지만 허용) |

##### 2-B. 의존성 보안 감사 강화

```bash
# 현재 (CI에서 실행)
npm audit --omit=dev --audit-level=high

# 강화 (추가 감사)
npm audit --audit-level=moderate
npx better-npm-audit audit
npx license-checker --failOn 'GPL;AGPL'
```

##### 2-C. RLS 자동화 테스트

```typescript
// supabase/tests/rls-audit.test.ts
describe('RLS Policy Audit', () => {
  it('User A cannot read User B shifts', async () => {
    // ...
  });
  it('User cannot set is_admin to true', async () => {
    // ...
  });
  it('Non-admin cannot access admin feedback', async () => {
    // ...
  });
});
```

#### Phase 3: 외부 침투 테스트 (선택, 권장)

- **범위:** Supabase Edge Function, Auth flow, RLS policies
- **예상 비용:** AUD $3,000 - $10,000
- **시기:** Phase 1 & 2 완료 후

### 검증 방법
1. `vercel.json`의 보안 헤더가 응답에 포함되는지 확인 (curl -I)
2. CORS 와일드카드가 제거되었는지 확인
3. Health endpoint에서 설정 정보가 노출되지 않는지 확인
4. `npm audit` 결과에 high/critical 취약점 없는지 확인

### 예상 소요 시간
- Phase 1 (즉시 조치): 2-3일
- Phase 2 (체계적 감사): 1-2주
- Phase 3 (침투 테스트): 외부 의뢰 2-4주

### 위험도: 높음 (데이터 유출 시 NDB 의무 발생)

---

## CRITICAL-7. Cookie 동의 미구현

### 현재 상태

**사용 중인 쿠키/스토리지:**

| 유형 | 키/이름 | 목적 | 분류 | 동의 필요 |
|------|---------|------|------|-----------|
| localStorage | `paychecker-storage-v2` | Zustand 상태 유지 (앱 핵심 기능) | 필수 (Essential) | 아니오 |
| Supabase Auth | `sb-*-auth-token` | 인증 세션 관리 | 필수 (Essential) | 아니오 |
| Google AdSense | 다수의 추적 쿠키 | 개인화 광고 | 광고 (Advertising) | **예** |
| Google AdSense | 행동 추적 | 광고 타겟팅 | 광고 (Advertising) | **예** |

**법적 요구사항:**
- **호주:** Cookie 동의가 명시적으로 법률 요구사항은 아니나, Privacy Act의 투명성 원칙에 의해 고지 필요
- **EU (GDPR/ePrivacy):** Working Holiday Maker 사용자가 EU 출신일 수 있으므로 명시적 동의 필요
- **Google AdSense 정책:** EU User Consent Policy에 의해 CMP 필수

### 수정 방안

#### Step 1: Cookie Consent 상태 관리 유틸리티

**파일:** `src/utils/cookieConsent.ts` (NEW)

```typescript
export type CookieCategory = 'essential' | 'advertising';

interface ConsentState {
  essential: boolean;    // 항상 true
  advertising: boolean;  // 사용자 선택
  timestamp: string;     // 동의 시점
  version: string;       // 동의 정책 버전
}

const CONSENT_KEY = 'paychecker-cookie-consent';
const CONSENT_VERSION = '1.0';

export function getConsentState(): ConsentState | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setConsentState(advertising: boolean): void {
  const state: ConsentState = {
    essential: true,
    advertising,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

export function getConsentStatus(category: CookieCategory): boolean {
  if (category === 'essential') return true;
  const state = getConsentState();
  return state?.[category] ?? false;
}

export function hasGivenConsent(): boolean {
  return getConsentState() !== null;
}

export function resetConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}
```

#### Step 2: Cookie Consent Banner 컴포넌트

**파일:** `src/components/CookieConsent/CookieBanner.tsx` (NEW)

기능:
- 첫 방문 시 하단에 배너 표시
- "Accept All" / "Essential Only" / "Manage Preferences" 버튼
- "Essential Only" 선택 시 AdSense 로드하지 않음
- 동의 상태를 localStorage에 저장
- Manage Preferences에서 카테고리별 토글

```
┌────────────────────────────────────────────────────────────────┐
│ 🍪 We use cookies                                              │
│                                                                │
│ We use essential cookies for the app to function and optional  │
│ cookies for advertising (Google AdSense).                      │
│                                                                │
│ Learn more in our [Cookie Policy] and [Privacy Policy].        │
│                                                                │
│ [Essential Only]  [Accept All]  [Manage Preferences]           │
└────────────────────────────────────────────────────────────────┘
```

#### Step 3: App.tsx에 통합

**파일:** `src/App.tsx`

```typescript
import { CookieBanner } from './components/CookieConsent/CookieBanner';
import { hasGivenConsent, getConsentStatus } from './utils/cookieConsent';
import { loadAdSense } from './utils/adSenseLoader';

function App() {
  const [showCookieBanner, setShowCookieBanner] = useState(!hasGivenConsent());
  
  useEffect(() => {
    if (getConsentStatus('advertising')) {
      loadAdSense();
    }
  }, []);
  
  const handleConsentChange = () => {
    setShowCookieBanner(false);
    if (getConsentStatus('advertising')) {
      loadAdSense();
    }
  };
  
  // ... 기존 코드
  
  return (
    <>
      {/* ... 기존 코드 */}
      {showCookieBanner && <CookieBanner onConsentGiven={handleConsentChange} />}
    </>
  );
}
```

#### Step 4: index.html에서 AdSense 스크립트 제거

**파일:** `index.html`

```diff
- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4516626856296531"
-  crossorigin="anonymous"></script>
```

AdSense는 이제 동의 후 동적으로 로드됩니다.

#### Step 5: GoogleAd 컴포넌트 수정

**파일:** `src/components/GoogleAd.tsx`

```typescript
export const GoogleAd: React.FC<GoogleAdProps> = (props) => {
  const hasConsent = getConsentStatus('advertising');
  
  // 광고 동의가 없으면 렌더링하지 않음
  if (!hasConsent) return null;
  
  // ... 기존 로직
};
```

#### Step 6: Cookie Policy 페이지 생성

**파일:** `public/cookie-policy.html` (NEW)

Privacy Policy, Terms of Service와 동일한 스타일로 작성:
- 사용되는 쿠키/스토리지 목록
- 각 쿠키의 목적, 보존 기간
- 쿠키 관리 방법
- 브라우저에서 쿠키 삭제하는 방법

#### Step 7: 푸터 및 사이트맵 업데이트

**파일:** `src/components/Content/SiteFooterLinks.tsx`
```diff
  const FOOTER_LINKS = [
    { href: '/about.html', label: 'About' },
    { href: '/privacy-policy.html', label: 'Privacy Policy' },
    { href: '/terms-of-service.html', label: 'Terms of Service' },
+   { href: '/cookie-policy.html', label: 'Cookie Policy' },
    { href: '/contact.html', label: 'Contact' },
  ];
```

**파일:** `public/sitemap.xml`
```diff
+ <url><loc>https://paychecker-six.vercel.app/cookie-policy.html</loc></url>
```

### 검증 방법
1. 첫 방문 시 쿠키 배너가 표시되는지 확인
2. "Essential Only" 선택 시 AdSense가 로드되지 않는지 확인
3. "Accept All" 선택 시 광고가 정상 표시되는지 확인
4. 동의 후 새로고침 시 배너가 다시 나타나지 않는지 확인
5. 브라우저 개발자 도구에서 쿠키 확인
6. Cookie Policy 페이지 접근 가능 확인

### 예상 소요 시간: 3-4일

### 위험도: 중간 (AdSense 정책 위반 가능)

---

## CRITICAL-8. 준거법 미지정

### 현재 상태

**파일:** `public/terms-of-service.html`

현재 Terms of Service에 다음이 **누락**되어 있습니다:
- 준거법 (Governing Law)
- 관할 법원 (Jurisdiction)
- 분쟁 해결 절차 (Dispute Resolution)
- 호주 소비자법 (ACL) 저축 조항

또한 다음도 누락:
- 사용자 콘텐츠 소유권 조항
- 배상 조항 (Indemnification)
- 최소 이용 연령
- AI 처리 고지
- 서비스 변경 통지 기간

### 수정 방안

#### Terms of Service에 추가해야 할 핵심 조항

##### 1. 준거법 (Governing Law)

```html
<h2>9. Governing Law</h2>
<p>
  These Terms are governed by the laws of [New South Wales / Victoria / 
  Queensland], Australia. Any disputes arising from or relating to these 
  Terms or the Service will be subject to the exclusive jurisdiction of 
  the courts of [State], Australia.
</p>
```

**Owner 결정 필요:** 어느 주(State) 법률을 적용할 것인지

##### 2. 분쟁 해결 (Dispute Resolution)

```html
<h2>10. Dispute Resolution</h2>
<p>
  Before initiating legal proceedings, you agree to attempt to resolve 
  any dispute informally by contacting us at [email]. If the dispute is 
  not resolved within 30 days, either party may pursue formal resolution 
  through the courts of [State], Australia.
</p>
<p>
  For complaints about the handling of personal information, you may also 
  contact the Office of the Australian Information Commissioner (OAIC) at 
  <a href="https://www.oaic.gov.au">www.oaic.gov.au</a>.
</p>
```

##### 3. 호주 소비자법 (ACL) 저축 조항

```html
<h2>11. Australian Consumer Law</h2>
<p>
  Nothing in these Terms excludes, restricts, or modifies any consumer 
  guarantee, right, or remedy conferred on you by the Australian Consumer 
  Law (Schedule 2 of the Competition and Consumer Act 2010) that cannot 
  be excluded, restricted, or modified by agreement.
</p>
```

**이것은 법적 필수 사항입니다.** 현재 Section 6의 "as is" 면책 조항과 함께, ACL 준수 조항이 없으면 해당 면책이 무효화될 수 있습니다.

##### 4. 사용자 콘텐츠 소유권

```html
<h2>12. User Content</h2>
<p>You retain all ownership rights to the data you create in PayChecker 
(shift records, job configurations, expense records, and other personal data).</p>
<p>By using the Service, you grant PayChecker a limited, non-exclusive license 
to process your data solely for the purpose of providing the Service to you.</p>
<p>When uploading roster images, you represent and warrant that:</p>
<ul>
  <li>You have the right or authorization to share the document</li>
  <li>You understand the image will be processed by third-party AI services</li>
  <li>You accept responsibility for any third-party personal information 
      contained in the uploaded content</li>
</ul>
```

##### 5. 배상 조항 (Indemnification)

```html
<h2>13. Indemnification</h2>
<p>You agree to indemnify and hold PayChecker harmless from any claims, 
damages, or expenses arising from:</p>
<ul>
  <li>Your use of the Service in violation of these Terms</li>
  <li>Content you upload that you do not have the right to share</li>
  <li>Reliance on estimates provided by the Service for tax, payroll, 
      or immigration purposes</li>
</ul>
```

##### 6. 재무 면책 조항 강화 (Section 1 수정)

```html
<h2>1. Service Scope and Financial Disclaimer</h2>
<p>PayChecker provides roster management and pay-estimation tools for 
planning and personal record-keeping purposes only.</p>
<p><strong>Important:</strong></p>
<ul>
  <li>PayChecker is <strong>NOT</strong> payroll software, a registered 
      tax agent, financial advice, legal advice, or immigration advice</li>
  <li>All monetary values (pay estimates, tax estimates, superannuation) 
      are <strong>approximations only</strong></li>
  <li>Tax estimates are based on publicly available ATO data and may not 
      reflect your actual tax obligations</li>
  <li>Always verify all amounts with your employer, official payslips, 
      and a registered tax agent</li>
  <li>PayChecker is not registered with the Tax Practitioners Board</li>
</ul>
```

##### 7. 최소 이용 연령

```html
<h2>14. Age Requirement</h2>
<p>You must be at least 16 years old to use PayChecker. By using the 
Service, you represent that you meet this age requirement.</p>
```

##### 8. AI 처리 고지

```html
<h2>15. AI-Powered Features</h2>
<p>PayChecker uses artificial intelligence (Google Gemini) to extract 
text from uploaded roster images. By using this feature, you acknowledge:</p>
<ul>
  <li>Images are transmitted to Google's servers for processing</li>
  <li>AI extraction may contain errors and must be verified by you</li>
  <li>You are responsible for reviewing all AI-extracted data before use</li>
</ul>
```

##### 9. 서비스 변경 통지

```html
<h2>16. Changes to Terms and Service</h2>
<p>We may update these Terms from time to time. For material changes, 
we will provide at least 30 days' notice via:</p>
<ul>
  <li>A notice posted on the Service</li>
  <li>An update to the effective date on this page</li>
</ul>
<p>Your continued use after the notice period constitutes acceptance 
of the updated Terms.</p>
```

### 전체 Terms of Service 구조 (수정 후)

```
1. Service Scope and Financial Disclaimer (강화)
2. Account Responsibilities (기존 유지)
3. Data Accuracy and Verification (기존 유지)
4. Availability and Modifications (기존 유지, 통지 기간 추가)
5. Third-Party Services (기존 유지)
6. Limitation of Liability (기존 유지, ACL 참조 추가)
7. Termination (기존 유지)
8. Contact (기존 유지)
9. Governing Law (NEW)
10. Dispute Resolution (NEW)
11. Australian Consumer Law (NEW - 필수)
12. User Content (NEW)
13. Indemnification (NEW)
14. Age Requirement (NEW)
15. AI-Powered Features (NEW)
16. Changes to Terms and Service (NEW)
```

### Owner 결정 필요 사항
- [ ] 준거법 주(State): NSW / VIC / QLD / 기타
- [ ] 최소 이용 연령: 16세 vs 13세
- [ ] 배상 조항의 범위

### 검증 방법
1. Terms of Service에 모든 필수 조항이 포함되었는지 확인
2. ACL 저축 조항이 Section 6 (Limitation of Liability)와 모순 없는지 확인
3. 법률 자문가의 검토 (권장)

### 예상 소요 시간: 2-3일 (법률 검토 별도)

### 위험도: 높음 (법적 문서이므로 전문가 검토 권장)

---

## 구현 우선순위 및 일정

### 우선순위 매트릭스

| 순위 | 항목 | 긴급도 | 복잡도 | 소요 시간 | 의존성 |
|------|------|--------|--------|-----------|--------|
| 1 | CRITICAL-1 (Super Rate) | 즉시 | 낮음 | 1시간 | 없음 |
| 2 | CRITICAL-8 (준거법) | 1주차 | 중간 | 2-3일 | Owner 결정 |
| 3 | CRITICAL-2 (Privacy Policy) | 1주차 | 높음 | 3-5일 | Owner 결정 |
| 4 | CRITICAL-3 (해외 전송) | 1주차 | 중간 | 2-3일 | CRITICAL-2와 병행 |
| 5 | CRITICAL-7 (Cookie 동의) | 2주차 | 중간 | 3-4일 | CRITICAL-5와 병행 |
| 6 | CRITICAL-5 (AdSense) | 2주차 | 중간 | 2-3일 | CRITICAL-7 필요 |
| 7 | CRITICAL-4 (세무사법) | 1-2주차 (코드) / 6주차 (법률) | 높음 | 코드 2-3일 + 법률 2-3주 | 법률 자문 |
| 8 | CRITICAL-6 (보안 감사) | 3주차 | 높음 | 1-2주 | CRITICAL-5,7 이후 |

### 실행 일정

```
Day 1 (즉시):
  ✅ CRITICAL-1: Super Rate 수정 (1시간)

Week 1:
  📝 CRITICAL-8: Terms of Service 재작성
  📝 CRITICAL-2: Privacy Policy 재작성
  📝 CRITICAL-3: 해외 전송 고지 (Privacy Policy에 포함)
  📝 CRITICAL-4 단계A: 세금 면책 조항 코드 추가

Week 2:
  🔧 CRITICAL-7: Cookie Consent 구현
  🔧 CRITICAL-5: AdSense 조건부 로드 (CRITICAL-7과 연계)
  📝 CRITICAL-4 단계A: 마케팅 문구 수정

Week 3:
  🔒 CRITICAL-6 Phase 1: CSP, CORS, 즉시 보안 조치
  🔒 CRITICAL-6 Phase 2: OWASP 체크리스트, RLS 감사

Week 4-6:
  ⚖️ CRITICAL-4 단계B: 세법 전문 변호사 의뢰
  ⚖️ CRITICAL-6 Phase 3: 외부 침투 테스트 (선택)
  ⚖️ CRITICAL-2 & 8: 법률 자문가 검토

Week 6+:
  ⚖️ CRITICAL-4 단계C: 법률 의견에 따른 후속 조치
```

### 총 예상 비용

| 항목 | 예상 비용 (AUD) | 필수 여부 |
|------|----------------|-----------|
| 개발자 작업 (3-4주) | 내부 비용 | 필수 |
| 세법 변호사 의견 | $2,000 - $5,000 | 강력 권장 |
| Terms/Privacy 법률 검토 | $1,500 - $3,000 | 권장 |
| 외부 침투 테스트 | $3,000 - $10,000 | 선택 |
| **합계** | **$6,500 - $18,000** | |

### Launch Gate 기준

**다음 항목이 모두 완료되기 전에는 공개 홍보를 시작하지 않습니다:**

1. ✅ CRITICAL-1 완료 (Super Rate 수정)
2. ✅ CRITICAL-2 완료 (Privacy Policy 재작성)
3. ✅ CRITICAL-3 완료 (해외 전송 고지)
4. ✅ CRITICAL-4 단계A 완료 (면책 조항 추가)
5. ✅ CRITICAL-5 완료 (AdSense 정책 준수)
6. ✅ CRITICAL-6 Phase 1 완료 (CSP, CORS 보안 조치)
7. ✅ CRITICAL-7 완료 (Cookie 동의)
8. ✅ CRITICAL-8 완료 (준거법 지정)
9. ⚖️ CRITICAL-4 단계B 착수 (법률 자문 의뢰)

**최소 준비 기간: 3-4주**

---

## Owner 결정 요약

모든 CRITICAL 항목의 수정을 진행하기 전에 다음 사항에 대한 결정이 필요합니다:

| # | 결정 사항 | 영향 범위 | 기본 권장안 |
|---|----------|-----------|------------|
| 1 | 운영 주체 (개인/법인) 및 ABN | CRITICAL-2, 3 | 개인 사업자로 시작 |
| 2 | 준거법 적용 주(State) | CRITICAL-8 | NSW (시드니 기반 가정) |
| 3 | 최소 이용 연령 | CRITICAL-2, 8 | 16세 |
| 4 | 한국 시장 진출 여부 | CRITICAL-2, 4 | 초기 런칭 시 제외 |
| 5 | 법률 자문 예산 승인 | CRITICAL-4 | AUD $3,500 - $8,000 |
| 6 | 실제 수신 가능한 이메일 주소 | CRITICAL-2, 3, 8 | 커스텀 도메인 이메일 |
| 7 | 외부 침투 테스트 승인 | CRITICAL-6 | 선택, 예산 여유 시 |
| 8 | 데이터 보존 기간 최종 확정 | CRITICAL-2 | 제안된 기간 승인 |

---

*End of Critical Issues Remediation Plan*
