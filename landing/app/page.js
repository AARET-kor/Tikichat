const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tikidoc.xyz";

const journeySteps = [
  {
    step: "예약 확정",
    title: "처음부터 환자 언어로 안내합니다",
    body: "링크 하나로 My Tiki가 열리고, 환자는 방문 전 필요한 정보와 준비할 일을 자기 언어로 확인합니다.",
  },
  {
    step: "문진 · 동의",
    title: "접수 전 공백을 줄입니다",
    body: "문진표와 동의서를 미리 작성하고, 병원은 누락된 준비 상태를 Tiki Desk에서 바로 봅니다.",
  },
  {
    step: "내원 · 이동",
    title: "지금 어디에 있고, 다음에 뭘 할지 보입니다",
    body: "환자는 My Tiki에서 자신의 단계와 다음 액션을 확인하고, 직원은 도착 순서와 준비 상태를 함께 봅니다.",
  },
  {
    step: "시술실",
    title: "Tiki Room이 의료진 통제 아래 소통을 돕습니다",
    body: "환자 말은 요약되고, 의료진이 고른 표현만 환자 언어로 전달됩니다. 자동 답변이 아니라 통제된 소통입니다.",
  },
  {
    step: "사후관리",
    title: "설명은 시술실에서 끝나지 않습니다",
    body: "주의사항, 회복 체크, follow-up까지 이어지고, 이상 신호는 병원 운영 화면에 올라옵니다.",
  },
];

const surfaces = [
  {
    name: "Tiki Paste",
    label: "상담 내용 정리",
    title: "채팅 내용을 붙여 넣으면, 직원 답변의 기준이 생깁니다",
    body: "기존 CRM이나 메신저를 갈아엎지 않아도 됩니다. 대화 내용을 붙여 넣으면 환자 의도, 위험 신호, 추천 답변을 정리하고 Quick Visit으로 넘길 수 있습니다.",
    meta: "CRM 교체 없이 시작",
  },
  {
    name: "My Tiki + TikiBell",
    label: "환자 안내",
    title: "환자는 혼자 눈치 보지 않아도 됩니다",
    body: "My Tiki는 환자의 개인 링크입니다. TikiBell은 그 안에서 문진, 동의, 오늘 할 일, 사후관리 질문을 차분하게 안내합니다.",
    meta: "환자 여정 동행",
  },
  {
    name: "Tiki Room",
    label: "시술실 소통",
    title: "통역이 사라지는 순간에도 설명은 이어집니다",
    body: "진료실과 시술실에서 환자 말을 요약하고, 의료진이 선택한 표현을 환자 언어로 전달합니다. 의료진 통제는 유지됩니다.",
    meta: "doctor-controlled",
  },
];

const valueCards = [
  {
    title: "잘 쓰던 CRM, 굳이 바꾸지 않아도 됩니다",
    body: "TikiDoc은 기존 시스템을 갈아엎는 제품이 아닙니다. 병원이 이미 쓰고 있는 운영 방식 위에 얹어, 외국인 환자 소통과 환자 경험을 향상시키는 AI 플랫폼입니다.",
  },
  {
    title: "복잡한 API 연동 없이도 시작할 수 있습니다",
    body: "초기 도입 장벽을 낮추고, 병원 현장에서 바로 쓸 수 있도록 설계됩니다. 먼저 실제 상담과 방문 흐름을 정리하고, 필요한 연동은 이후에 판단합니다.",
  },
  {
    title: "직원마다 다른 답변, 이제 하나의 기준으로 맞춥니다",
    body: "병원별 protocol과 승인된 정보를 기반으로 더 일정하고 신뢰할 수 있는 소통을 돕습니다. 환자마다 설명이 달라지는 위험을 줄입니다.",
  },
  {
    title: "언어별 환자 흐름이 흔들리지 않게 합니다",
    body: "일본인 환자가 많은 날, 중국인 환자가 많은 날마다 코디를 더 뽑고 교육하기는 어렵습니다. TikiDoc은 접수부터 사후관리까지 응대의 공백을 줄입니다.",
  },
];

const plans = [
  {
    name: "Start",
    scale: "외국인 환자 응대를 막 시작하는 병원",
    badge: "가볍게 검증",
    body: "기존 운영을 유지하면서 My Tiki 링크, Tiki Paste, 기본 환자 안내 흐름부터 시작합니다.",
    features: ["초기 세팅 상담", "기본 환자 링크 플로우", "직원용 sidecar 사용", "도입 범위 점검"],
  },
  {
    name: "Operate",
    scale: "외국인 환자 비중이 꾸준한 병원",
    badge: "추천",
    body: "예약, 내원, 시술실, 사후관리까지 이어지는 운영 흐름을 병원 기준에 맞춰 정리합니다.",
    features: ["Tiki Desk 운영 보드", "My Tiki + TikiBell", "Tiki Room", "사후관리 체크인", "프로토콜 기반 응대"],
    featured: true,
  },
  {
    name: "Scale",
    scale: "여러 지점 또는 확장 운영",
    badge: "상담 후 설계",
    body: "여러 역할, 여러 지점, 여러 언어권 환자 흐름을 단계적으로 확장할 때 맞춥니다.",
    features: ["지점별 운영 설계", "고급 설정 협의", "직원 온보딩", "확장 로드맵 정리"],
  },
];

const shortCopies = [
  "외국인 환자 응대, 상담실에서만 끝내지 마세요",
  "통역이 사라진 뒤의 공백을 메우는 AI",
  "설명은 끝까지 이어져야 합니다",
  "병원은 더 효율적으로, 환자는 덜 불안하게",
];

export default function LandingPage() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner wrap">
          <a href="/" className="brand" aria-label="TikiDoc home">
            <span className="brand-mark">T</span>
            <span>TikiDoc</span>
          </a>
          <ul className="nav-links">
            <li><a href="#problem">문제</a></li>
            <li><a href="#journey">환자 여정</a></li>
            <li><a href="#surfaces">제품</a></li>
            <li><a href="#pricing">도입 상담</a></li>
          </ul>
          <div className="nav-actions">
            <a className="btn btn-ghost" href={`${APP_URL}/login`}>로그인</a>
            <a className="btn btn-primary" href={APP_URL}>앱 열기</a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero wrap">
          <div className="hero-copy reveal" style={{ "--i": 0 }}>
            <p className="eyebrow"><span />AI communication platform for clinics</p>
            <h1>외국인 환자와의 소통,<br />더이상 중간에 끊기지 않습니다</h1>
            <p className="hero-lead">
              병원은 모든 외국인 환자에게 전담 코디를 끝까지 붙여줄 수 없습니다. 대신 TikiDoc이 예약, 내원, 시술, 사후관리까지 환자의 여정을 따라가는 개인화 AI 비서가 되어 병원과 환자의 소통을 이어줍니다.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-large" href={APP_URL}>TikiDoc 시작하기</a>
              <a className="btn btn-secondary btn-large" href="#problem">왜 필요한지 보기</a>
            </div>
            <p className="brand-line">통역이 아니라, 믿음이 끊기지 않게 만드는 시스템</p>
          </div>

          <div className="hero-visual reveal" style={{ "--i": 1 }} aria-label="TikiDoc patient journey rotor">
            <div className="orbital-scene">
              <div className="core-card">
                <span>Trust loop</span>
                <strong>신뢰로 시작해,<br />안심으로 끝나는 병원 경험</strong>
                <p>예약 · 내원 · 시술 · 회복 · follow-up</p>
              </div>
              <div className="orbit orbit-one">
                {journeySteps.map((item, index) => (
                  <div className="orbit-chip" key={item.step} style={{ "--n": index }}>
                    <strong>{item.step}</strong>
                    <span>{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="orbit orbit-two">
                {shortCopies.map((copy, index) => (
                  <div className="ribbon-copy" key={copy} style={{ "--n": index }}>{copy}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section problem-section" id="problem">
          <div className="wrap split">
            <div className="section-copy reveal">
              <p className="eyebrow"><span />Problem recognition</p>
              <h2>외국인 환자는 병원이 무섭습니다</h2>
            </div>
            <div className="long-copy reveal" style={{ "--i": 1 }}>
              <p>상담할 때는 통역이 붙어 있어도, 막상 접수하고, 이동하고, 시술을 받고, 회복실에 누워 있을 때는 환자 혼자 손짓과 눈치로 버텨야 하는 순간이 많습니다.</p>
              <p>지금 내가 받는 시술이 무엇인지, 이 통증이 괜찮은 건지, 지금 어떤 순서로 진행되는지, 호텔로 돌아간 뒤 무엇을 조심해야 하는지 정확히 이해하지 못한 채 지나가는 순간이 너무 많습니다.</p>
              <p>병원은 환자 한 명 한 명에게 전담 코디를 끝까지 붙여줄 수 없으니까요. 그래서 필요한 것은 단순 번역기가 아니라, 환자의 여정을 따라다니는 AI 비서, TikiDoc입니다.</p>
            </div>
          </div>
        </section>

        <section className="section solution-section" id="journey">
          <div className="wrap">
            <div className="section-header reveal">
              <p className="eyebrow"><span />Patient journey</p>
              <h2>TikiDoc은 환자의 동선을 따라갑니다</h2>
              <p>예약이 확정되는 순간부터 TikiDoc은 환자에게 개인화된 안내와 소통 창구를 제공합니다. My Tiki와 Tiki Room, 그리고 TikiBell이 환자의 여정을 상담실 문 앞에서만 끝나지 않게 만듭니다.</p>
            </div>
            <div className="journey-grid">
              {journeySteps.map((item, index) => (
                <article className="journey-card reveal" key={item.step} style={{ "--i": index }}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.step}</strong>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section surfaces-section" id="surfaces">
          <div className="wrap">
            <div className="section-header reveal">
              <p className="eyebrow"><span />Product surfaces</p>
              <h2>환자에게는 안심을, 병원에게는 기준을.</h2>
              <p>TikiDoc은 하나의 챗봇이 아닙니다. 상담을 정리하는 도구, 환자가 보는 포털, 시술실 소통 화면이 각자의 자리에서 이어집니다.</p>
            </div>
            <div className="surface-grid">
              {surfaces.map((surface, index) => (
                <article className="surface-card reveal" key={surface.name} style={{ "--i": index }}>
                  <div className="surface-top"><span>{surface.label}</span><em>{surface.meta}</em></div>
                  <h3>{surface.name}</h3>
                  <h4>{surface.title}</h4>
                  <p>{surface.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section value-section">
          <div className="wrap">
            <div className="section-header reveal">
              <p className="eyebrow"><span />Operational value</p>
              <h2>기존 운영을 갈아엎지 않고, 외국인 환자 응대의 기준을 세웁니다</h2>
            </div>
            <div className="value-grid">
              {valueCards.map((card, index) => (
                <article className="value-card reveal" key={card.title} style={{ "--i": index }}>
                  <span>{index + 1}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section pricing-section" id="pricing">
          <div className="wrap">
            <div className="section-header pricing-header reveal">
              <p className="eyebrow"><span />Pricing</p>
              <h2>코디네이터 1명보다 적은 비용으로, 예약부터 사후관리까지 이어지는 외국인 환자 운영 시스템</h2>
              <p>외국인 환자가 늘어날수록 필요한 것은 더 많은 임시 인력이 아니라, 더 일정하고, 더 오래 작동하고, 더 쉽게 확장되는 시스템입니다. TikiDoc은 코디네이터 한 명의 월급보다 적은 비용으로 환자 여정과 병원 커뮤니케이션을 정리해줍니다.</p>
            </div>
            <div className="pricing-grid">
              {plans.map((plan, index) => (
                <article className={`plan-card reveal${plan.featured ? " featured" : ""}`} key={plan.name} style={{ "--i": index }}>
                  <div className="plan-top"><span>{plan.scale}</span><em>{plan.badge}</em></div>
                  <h3>{plan.name}</h3>
                  <p>{plan.body}</p>
                  <div className="plan-price">상담 후 안내</div>
                  <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <a className={plan.featured ? "btn btn-primary" : "btn btn-secondary"} href={`${APP_URL}/login`}>{plan.featured ? "도입 상담 시작" : "문의하기"}</a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <div className="cta-panel reveal">
              <div>
                <p className="eyebrow light"><span />TikiDoc</p>
                <h2>티키닥, 소통이 끊기지 않게.<br />신뢰가 끊기지 않게.</h2>
                <p>외국인 환자와 병원의 신뢰와 존중을 처음부터 끝까지 연결하는 AI 커뮤니케이션 플랫폼.</p>
              </div>
              <div className="cta-actions">
                <a className="btn btn-invert btn-large" href={APP_URL}>앱 열기</a>
                <a className="cta-login" href={`${APP_URL}/login`}>이미 계정이 있으신가요? 로그인</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner wrap">
          <div className="footer-brand">
            <a href="/" className="brand" aria-label="TikiDoc home">
              <span className="brand-mark small">T</span>
              <span>TikiDoc</span>
            </a>
            <p>통역이 아니라, 믿음이 끊기지 않게 만드는 시스템</p>
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
