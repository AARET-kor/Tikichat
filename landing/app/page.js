const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tikidoc.xyz";

const products = [
  {
    name: "My Tiki",
    stage: "환자 포털",
    title: "환자가 링크 하나로 방문 여정을 완성합니다",
    body: "QR 링크를 받으면 환자는 언어를 선택하고, 문진을 작성하고, 도착을 직접 체크인합니다. 직원 호출 없이, 다국어 환자도 같은 흐름 안에서 준비합니다.",
    note: "환자에게는 단순하고, 직원에게는 누락이 바로 보입니다.",
    className: "mytiki",
  },
  {
    name: "Tiki Room",
    stage: "진료실 소통",
    title: "진료실 안에서 언어가 장벽이 되지 않도록",
    body: "환자 말을 요약하고, 의사가 선택한 표현을 환자 언어로 전달합니다. 소통의 주도권은 항상 의료진에게 있습니다. 자동 답변 없음, 인터프리터 없음.",
    note: "doctor-controlled flow — 의사가 모든 응답을 선택합니다.",
    className: "room",
  },
  {
    name: "TikiBell",
    stage: "사후관리",
    title: "퇴원 후에도 케어 흐름이 이어집니다",
    body: "TikiBell이 시술 후 체크포인트마다 환자와 연결됩니다. 이상 신호는 운영 보드에 올라오고, 안전이 확인되면 재방문 안내로 이어집니다.",
    note: "안전 확인 → 재방문 유도 순서를 지킵니다.",
    className: "",
  },
];

const plans = [
  {
    name: "Pilot Clinic",
    scale: "작은 클리닉 / 첫 도입",
    highlight: "낮은 리스크로 시작",
    description: "한 지점에서 실제 환자 흐름을 검증하고 싶은 클리닉에 맞춥니다.",
    features: ["기본 환자 링크 흐름", "My Tiki / Tiki Room / TikiBell", "초기 운영 세팅 지원"],
    featured: false,
  },
  {
    name: "Growth Clinic",
    scale: "운영량이 있는 클리닉",
    highlight: "권장",
    description: "반복 문의, 다국어 환자, 사후관리 흐름을 안정적으로 운영하려는 팀에 적합합니다.",
    features: ["운영 보드 중심 워크플로", "시술 / 프로토콜 기반 응답", "사후관리 플랜 운영", "직원 사용 온보딩"],
    featured: true,
  },
  {
    name: "Clinic Group",
    scale: "다지점 / 확장 운영",
    highlight: "상담 후 설계",
    description: "여러 지점, 여러 역할, 운영 정책 차이가 있는 조직에 맞춰 도입 범위를 정합니다.",
    features: ["지점별 운영 구성", "고급 설정 협의", "도입 / 교육 계획", "확장 로드맵 정리"],
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner wrap">
          <a href="/" className="brand" aria-label="TikiDoc home">
            <span className="brand-mark">T</span>
            <span>TikiDoc</span>
          </a>
          <ul className="nav-links">
            <li><a href="#why-now">문제</a></li>
            <li><a href="#journey">환자 여정</a></li>
            <li><a href="#products">제품</a></li>
            <li><a href="#pricing">도입 상담</a></li>
          </ul>
          <div className="nav-actions">
            <a className="btn btn-quiet" href={`${APP_URL}/login`}>로그인</a>
            <a className="btn btn-primary" href={APP_URL}>앱 열기</a>
          </div>
        </div>
      </nav>

      <main>

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow"><span />클리닉 전용 AI 운영 도구</p>
            <h1>
              외국인 환자도,<br />
              복잡한 시술도.<br />
              클리닉은 흔들리지 않습니다.
            </h1>
            <p className="hero-lead">
              TikiDoc은 환자 포털, 진료실 소통, 사후관리를 하나의 운영 흐름으로 연결합니다.
              화려한 기능보다 실제 클리닉이 매일 쓰는 도구를 만들었습니다.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-large" href={APP_URL}>앱에서 확인하기</a>
              <a className="btn btn-secondary btn-large" href="#pricing">도입 상담 보기</a>
            </div>
          </div>

          {/* Tiki Room scene — the first proof */}
          <div className="hero-board" aria-label="Tiki Room live demo">
            <div className="board-top">
              <div>
                <span className="board-kicker">TIKI ROOM · 진료실 A</span>
                <strong>실시간 소통 중</strong>
              </div>
              <span className="board-status">● LIVE</span>
            </div>
            <div className="flow-stack">
              <div className="flow-row active">
                <span className="flow-time">🗣️</span>
                <div>
                  <strong>환자 입력 (中文)</strong>
                  <p>"시술 후 얼굴이 많이 당기는데 정상인가요?"</p>
                </div>
                <span className="flow-badge">수신됨</span>
              </div>
              <div className="flow-row">
                <span className="flow-time">🧠</span>
                <div>
                  <strong>의사 검토 (한국어 요약)</strong>
                  <p>시술 후 당김 — 정상 반응 여부 확인 요청</p>
                </div>
                <span className="flow-badge calm">검토 중</span>
              </div>
              <div className="flow-row">
                <span className="flow-time">✓</span>
                <div>
                  <strong>의사 선택 → 전달</strong>
                  <p>"정상입니다. 48시간 내 완화됩니다." → 中文 전달</p>
                </div>
                <span className="flow-badge">전달 완료</span>
              </div>
            </div>
            <div className="board-metrics">
              <div><strong>🇺🇸🇯🇵🇨🇳</strong><span>오늘 언어</span></div>
              <div><strong>3명</strong><span>진료 중</span></div>
              <div><strong>0</strong><span>자동 답변</span></div>
            </div>
          </div>
        </section>

        {/* ── Why now ───────────────────────────────────────────────── */}
        <section className="section" id="why-now">
          <div className="wrap split">
            <div className="section-copy">
              <p className="eyebrow"><span />Why now</p>
              <h2>클리닉 운영의 병목은 이미 환자 여정 안에서 생깁니다.</h2>
              <p>
                직원은 문의, 문진, 도착 확인, 진료실 소통, 사후관리까지 계속 끊긴 화면을 오갑니다.
                TikiDoc은 이 병목을 더 많은 대시보드가 아니라 더 명확한 환자 흐름으로 정리합니다.
              </p>
            </div>
            <div className="problem-list">
              <article>
                <span>01</span>
                <strong>반복 질문이 직원 시간을 갉아먹습니다</strong>
                <p>시술 전 같은 안내가 매번 직원 손을 거칩니다. Tiki Paste가 검토 가능한 답변을 미리 정리합니다.</p>
              </article>
              <article>
                <span>02</span>
                <strong>도착 후 누가 무엇을 해야 하는지 늦게 보입니다</strong>
                <p>예약 순서, 실제 도착 순서, 준비 상태가 분리되면 현장 판단이 늦어집니다.</p>
              </article>
              <article>
                <span>03</span>
                <strong>사후관리는 중요하지만 운영에서는 자주 빠집니다</strong>
                <p>환자 반응과 이상 신호가 보이지 않으면 재방문과 안전 관리가 모두 약해집니다.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ── Patient journey ───────────────────────────────────────── */}
        <section className="section warm" id="journey">
          <div className="wrap">
            <div className="section-header">
              <p className="eyebrow"><span />Patient journey</p>
              <h2>예약부터 사후관리까지, 한 번에 읽히는 환자 흐름.</h2>
            </div>
            <div className="journey-track">
              {[
                { step: "문의", desc: "Tiki Paste가 반복 문의를 직원 검토 가능한 답변으로 정리합니다." },
                { step: "예약", desc: "환자 링크가 생성되고, 방문 전 준비 안내가 자동으로 전달됩니다." },
                { step: "방문 준비", desc: "My Tiki에서 언어 선택, 문진 작성, 주의사항 확인을 완료합니다." },
                { step: "도착", desc: "환자가 직접 체크인하면 Tiki Desk 운영 보드에 즉시 반영됩니다." },
                { step: "진료실", desc: "Tiki Room이 의사와 환자의 다국어 소통을 의사 통제 아래 돕습니다." },
                { step: "사후관리", desc: "TikiBell이 케어 흐름을 이어가고, 이상 신호는 운영 보드에 올라옵니다." },
              ].map(({ step, desc }, index) => (
                <article className="journey-card" key={step}>
                  <span className="journey-number">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Product surfaces ──────────────────────────────────────── */}
        <section className="section" id="products">
          <div className="wrap">
            <div className="section-header">
              <p className="eyebrow"><span />Product surfaces</p>
              <h2>세 개의 제품이 각자 한 가지 일을 분명하게 합니다.</h2>
              <p>모든 것을 하나의 챗봇으로 밀어 넣지 않고, 현장 사용 맥락에 맞춰 나눴습니다.</p>
            </div>
            <div className="product-grid">
              {products.map((product) => (
                <article className={`product-card ${product.className}`} key={product.name}>
                  <div className="product-card-head">
                    <div className="product-dot" />
                    <span>{product.stage}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <h4>{product.title}</h4>
                  <p>{product.body}</p>
                  <div className="product-note">{product.note}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tiki Desk ops layer ───────────────────────────────────── */}
        <section className="section warm">
          <div className="wrap ops-grid">
            <div className="section-copy">
              <p className="eyebrow"><span />Tiki Desk · 내부 운영</p>
              <h2>직원이 보는 운영 보드. 환자에게는 보이지 않습니다.</h2>
              <p>
                도착 순서, 방 배정, 에스컬레이션, 사후관리 — Tiki Desk가 클리닉 전체를 한 화면에 정리합니다.
                직원 전용 내부 도구로, 더 많은 대시보드가 아니라 더 명확한 운영 판단을 위해 만들었습니다.
              </p>
            </div>
            <div className="ops-panel">
              <div className="ops-line">
                <span>🇺🇸 Sarah M. · 필러</span>
                <strong>룸 A 배정 완료</strong>
              </div>
              <div className="ops-line">
                <span>🇨🇳 李小红 · 보톡스</span>
                <strong>도착 · 문진 완료</strong>
              </div>
              <div className="ops-line urgent">
                <span>🇯🇵 田中 花子 · 리프팅</span>
                <strong>동의서 미완료 ⚠</strong>
              </div>
              <div className="ops-line">
                <span>🇰🇷 김지수 · 실리프팅</span>
                <strong>예약 · 대기 중</strong>
              </div>
              <div className="ops-line">
                <span>사후관리 팔로업</span>
                <strong>오늘 3건 발송 예정</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing / 도입 상담 ───────────────────────────────────── */}
        <section className="section" id="pricing">
          <div className="wrap">
            <div className="section-header pricing-header">
              <p className="eyebrow"><span />도입 상담</p>
              <h2>클리닉 규모에 맞게 시작합니다.</h2>
              <p>작은 검증부터 다지점 확장까지, 실제 운영 규모에 맞춰 도입 범위를 정합니다.</p>
            </div>
            <div className="pricing-grid">
              {plans.map((plan) => (
                <article className={`plan-card${plan.featured ? " featured" : ""}`} key={plan.name}>
                  <div className="plan-top">
                    <span className="plan-scale">{plan.scale}</span>
                    <span className="plan-highlight">{plan.highlight}</span>
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <div className="plan-price">상담 후 안내</div>
                  <ul>
                    {plan.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  <a
                    className={`btn${plan.featured ? " btn-primary" : " btn-secondary"}`}
                    href={`${APP_URL}/login`}
                  >
                    {plan.featured ? "시작하기" : "문의하기"}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <section className="cta-section">
          <div className="wrap">
            <div className="cta-panel">
              <div>
                <p className="eyebrow light"><span />지금 시작하기</p>
                <h2>다음 예약이 외국인 환자여도<br />클리닉은 준비되어 있어야 합니다.</h2>
                <p>app.tikidoc.xyz에서 바로 시작할 수 있습니다.</p>
              </div>
              <div className="cta-actions">
                <a className="btn btn-invert btn-large" href={APP_URL}>앱 열기 →</a>
                <a className="cta-login" href={`${APP_URL}/login`}>이미 계정이 있으신가요? 로그인</a>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner wrap">
          <div className="footer-brand">
            <a href="/" className="brand" aria-label="TikiDoc home">
              <span className="brand-mark small">T</span>
              <span>TikiDoc</span>
            </a>
            <p>클리닉 운영을 위한 전용 AI 도구</p>
          </div>
          <ul className="footer-links">
            <li><a href={APP_URL}>앱 열기</a></li>
            <li><a href={`${APP_URL}/login`}>로그인</a></li>
          </ul>
        </div>
      </footer>
    </>
  );
}
