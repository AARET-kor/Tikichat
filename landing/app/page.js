const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tikidoc.xyz";

const journeySteps = [
  {
    step: "예약 확정",
    title: "링크 하나로 환자 여정이 시작됩니다",
    body: "환자는 My Tiki에서 자기 언어로 준비 사항을 확인하고, 병원은 방문 전부터 필요한 정보를 정리합니다.",
  },
  {
    step: "문진 · 동의",
    title: "접수 전에 불안을 줄입니다",
    body: "문진표와 동의서를 미리 받고, 누락된 항목은 직원 화면에 바로 드러납니다.",
  },
  {
    step: "내원 · 이동",
    title: "지금 단계와 다음 행동이 보입니다",
    body: "환자는 다음에 무엇을 하면 되는지 알고, 직원은 도착 순서와 대기 흐름을 한눈에 봅니다.",
  },
  {
    step: "시술실",
    title: "통역이 사라지는 순간을 메웁니다",
    body: "Tiki Room은 의료진이 통제하는 방식으로 환자의 말과 설명을 이어줍니다.",
  },
  {
    step: "사후관리",
    title: "호텔로 돌아간 뒤에도 설명은 남습니다",
    body: "주의사항, 회복 체크, follow-up까지 이어지고 이상 신호는 병원 운영 화면으로 올라옵니다.",
  },
];

const productSurfaces = [
  {
    name: "Tiki Paste",
    label: "상담 정리",
    title: "복사한 상담을 환자 흐름으로 바꿉니다",
    body: "기존 CRM이나 메신저를 바꾸지 않아도 됩니다. 상담 내용을 붙여 넣으면 환자 후보, 방문 후보, 의도, 위험 신호, 추천 답변을 정리합니다.",
  },
  {
    name: "My Tiki + TikiBell",
    label: "환자 포털",
    title: "환자가 혼자 눈치 보지 않게 합니다",
    body: "My Tiki는 환자 전용 링크입니다. TikiBell은 그 안에서 문진, 동의, 오늘 할 일, 사후관리 질문을 차분하게 안내합니다.",
  },
  {
    name: "Tiki Room",
    label: "시술실 소통",
    title: "의료진 통제 아래 소통을 이어갑니다",
    body: "환자의 말을 요약하고, 의료진이 선택한 표현만 환자 언어로 전달합니다. 자동 답변이 아니라 통제된 커뮤니케이션입니다.",
  },
];

const valueCards = [
  {
    title: "잘 쓰던 CRM, 굳이 바꾸지 않아도 됩니다.",
    body: "TikiDoc은 기존 시스템을 갈아엎는 제품이 아닙니다. 병원이 이미 쓰고 있는 운영 방식 위에 얹어, 외국인 환자 소통과 환자 경험을 정리합니다.",
  },
  {
    title: "복잡한 API 연동 없이도 시작할 수 있습니다.",
    body: "처음부터 큰 연동 프로젝트를 만들 필요는 없습니다. 수동 캡처, CSV, 링크 발급부터 시작하고 필요한 연동은 실제 운영 흐름이 확인된 뒤 붙이면 됩니다.",
  },
  {
    title: "직원마다 다른 답변과 설명을 하나의 기준으로 맞춥니다.",
    body: "병원별 protocol과 승인된 정보를 기반으로 더 일정하고 신뢰할 수 있는 안내를 돕습니다. 환자마다 설명이 달라지는 위험을 줄입니다.",
  },
  {
    title: "언어권별 환자 흐름이 흔들리지 않게 합니다.",
    body: "일본인 환자가 많은 날, 중국인 환자가 많은 날마다 인력을 다시 짜기는 어렵습니다. TikiDoc은 접수부터 사후케어까지 응대의 공백을 줄입니다.",
  },
];

const plans = [
  {
    name: "Start",
    scale: "외국인 환자 응대를 막 정리하려는 병원",
    badge: "가볍게 검증",
    body: "My Tiki 링크와 Tiki Paste부터 시작해 실제 환자 흐름에 맞는 도입 범위를 확인합니다.",
    features: ["초기 운영 상담", "기본 환자 링크 플로우", "상담 내용 정리", "도입 범위 점검"],
  },
  {
    name: "Operate",
    scale: "외국인 환자 비중이 꾸준한 병원",
    badge: "추천",
    body: "예약, 내원, 시술실, 사후관리까지 이어지는 운영 흐름을 병원 기준에 맞춰 세팅합니다.",
    features: ["Tiki Desk 운영 보드", "My Tiki + TikiBell", "Tiki Room", "사후관리 체크인", "프로토콜 기반 응대"],
    featured: true,
  },
  {
    name: "Scale",
    scale: "여러 지점 또는 확장 운영",
    badge: "상담 후 설계",
    body: "여러 역할, 여러 지점, 여러 언어권 환자 흐름을 단계적으로 확장합니다.",
    features: ["지점별 운영 설계", "고급 설정 협의", "직원 온보딩", "확장 로드맵 정리"],
  },
];

const signalCopies = [
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
        <section className="hero">
          <div className="hero-media" aria-hidden="true">
            <video autoPlay muted loop playsInline preload="metadata">
              <source src="/media/tikidoc-trust-flow.mp4" type="video/mp4" />
            </video>
            <div className="hero-media-overlay" />
          </div>

          <div className="hero-inner wrap">
            <div className="hero-copy reveal" style={{ "--i": 0 }}>
              <p className="eyebrow light"><span />Foreign patient journey AI</p>
              <h1>외국인 환자와의 소통,<br />더이상 중간에 끊기지 않습니다</h1>
              <p className="hero-lead">
                병원은 모든 외국인 환자에게 전담 코디를 끝까지 붙여줄 수 없습니다.
                대신 TikiDoc이 예약, 내원, 시술, 사후관리까지 환자의 여정을 따라가는
                개인화 AI 비서가 되어 병원과 환자의 소통을 이어줍니다.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary btn-large" href={`${APP_URL}/login`}>도입 상담 시작</a>
                <a className="btn btn-glass btn-large" href="#problem">왜 필요한지 보기</a>
              </div>
              <p className="positioning">통역이 아니라, 믿음이 끊기지 않게 만드는 시스템</p>
            </div>

            <div className="hero-board reveal" style={{ "--i": 1 }}>
              <div className="trust-card">
                <span>Core concept</span>
                <strong>외국인 환자와 병원의 신뢰와 존중을 처음부터 끝까지 연결합니다.</strong>
                <p>예약 · 내원 · 시술 · 회복 · follow-up</p>
              </div>
              <div className="rotator" aria-hidden="true">
                {signalCopies.map((copy, index) => (
                  <div className="rotator-chip" key={copy} style={{ "--n": index }}>{copy}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section problem-section" id="problem">
          <div className="wrap split">
            <div className="section-copy reveal">
              <p className="eyebrow"><span />Problem</p>
              <h2>외국인 환자는 병원이 무섭습니다</h2>
            </div>
            <div className="long-copy reveal" style={{ "--i": 1 }}>
              <p>
                상담할 때는 통역이 붙어 있어도, 막상 접수하고, 이동하고, 시술을 받고,
                회복실에 누워 있을 때는 환자 혼자 손짓과 눈치로 버텨야 하는 순간이 많습니다.
              </p>
              <p>
                지금 내가 받는 시술이 무엇인지, 이 통증이 괜찮은 건지, 지금 어떤 순서로
                진행되는지, 호텔로 돌아간 뒤 무엇을 조심해야 하는지. 정확히 이해하지 못한 채
                지나가는 순간이 너무 많습니다.
              </p>
              <p>
                병원은 환자 한 명 한 명에게 전담 코디를 끝까지 붙여줄 수 없으니까요.
                그래서 필요한 것은 단순 번역기가 아니라, 환자의 여정을 따라다니는 AI 비서,
                TikiDoc입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="section journey-section" id="journey">
          <div className="wrap">
            <div className="section-header reveal">
              <p className="eyebrow"><span />Journey</p>
              <h2>TikiDoc은 환자의 동선을 따라갑니다</h2>
              <p>
                예약이 확정되는 순간부터 환자에게 개인화된 안내와 소통 창구를 제공합니다.
                My Tiki에서 문진표와 동의서를 작성하고, 현재 자신의 단계와 다음 해야 할 일을
                확인합니다. 내원 후에는 My Tiki와 Tiki Room이 병원과 환자의 대화를 돕고,
                시술 후에는 주의사항과 follow-up까지 이어집니다.
              </p>
            </div>

            <div className="journey-track">
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
              <p>
                TikiDoc은 하나의 번역 화면이 아닙니다. 상담을 정리하는 Tiki Paste,
                환자가 보는 My Tiki와 TikiBell, 시술실의 Tiki Room이 서로 이어져
                외국인 환자 여정을 하나의 흐름으로 만듭니다.
              </p>
            </div>

            <div className="surface-grid">
              {productSurfaces.map((surface, index) => (
                <article className="surface-card reveal" key={surface.name} style={{ "--i": index }}>
                  <div className="surface-top">
                    <span>{surface.label}</span>
                    <em>{String(index + 1).padStart(2, "0")}</em>
                  </div>
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
            <div className="pricing-panel">
              <div className="section-header pricing-header reveal">
                <p className="eyebrow light"><span />Pricing</p>
                <h2>전담 코디를 늘리지 않아도, 환자와 병원의 소통은 더 촘촘해질 수 있습니다</h2>
                <p>
                  외국인 환자가 늘어날수록 필요한 것은 더 많은 임시 인력이 아니라,
                  더 일정하고, 더 오래 작동하고, 더 쉽게 확장되는 시스템입니다.
                  TikiDoc은 코디네이터 한 명의 월급보다 적은 비용으로 예약 이후의 환자 여정과
                  병원 커뮤니케이션을 정리해줍니다.
                </p>
              </div>

              <div className="pricing-grid">
                {plans.map((plan, index) => (
                  <article className={`plan-card reveal${plan.featured ? " featured" : ""}`} key={plan.name} style={{ "--i": index }}>
                    <div className="plan-top"><span>{plan.scale}</span><em>{plan.badge}</em></div>
                    <h3>{plan.name}</h3>
                    <p>{plan.body}</p>
                    <div className="plan-price">상담 후 안내</div>
                    <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                    <a className={plan.featured ? "btn btn-primary" : "btn btn-secondary"} href={`${APP_URL}/login`}>
                      {plan.featured ? "도입 상담 시작" : "문의하기"}
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <div className="cta-panel reveal">
              <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
                <source src="/media/tikidoc-trust-flow.mp4" type="video/mp4" />
              </video>
              <div className="cta-content">
                <p className="eyebrow light"><span />TikiDoc</p>
                <h2>티키닥, 소통이 끊기지 않게.<br />신뢰가 끊기지 않게.</h2>
                <p>신뢰로 시작해, 안심으로 끝나는 병원 경험을 만듭니다.</p>
              </div>
              <div className="cta-actions">
                <a className="btn btn-invert btn-large" href={`${APP_URL}/login`}>도입 상담 시작</a>
                <a className="cta-login" href={APP_URL}>앱 열기</a>
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
