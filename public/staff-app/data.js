export const conversationsSeed = [
  {
    id: "conv-1",
    patientName: "Airi Sato",
    avatar: "AS",
    countryFlag: "🇯🇵",
    language: "일본어",
    channel: "instagram",
    time: "3분 전",
    unread: true,
    status: "pending",
    procedure: "Botox",
    preview: "ボトックスの価格を教えてください。今週予約できますか？",
    lastActive: "방금 전 업데이트",
    visits: 2,
    stage: "new",
    tags: [
      { label: "#VIP", tone: "rose" },
      { label: "#보톡스_관심", tone: "brand" },
    ],
    notes: [
      "도쿄 거주. 한국 방문 일정이 짧아 당일 시술 가능 여부를 중요하게 봄.",
      "통역 없이도 일본어 메시지 대응 선호.",
    ],
    aftercareSnapshot: [
      { key: "D+1", state: "scheduled", detail: "시술 후 자동 발송 예정" },
      { key: "D+3", state: "unset", detail: "시술 확정 후 세팅" },
    ],
    gallery: [
      {
        id: "g-1",
        label: "Consult Ref",
        type: "before",
        image:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "g-2",
        label: "Forehead Close-up",
        type: "patient-upload",
        image:
          "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
      },
    ],
    timeline: [
      { date: "2026.04.07", title: "가격 문의 접수", detail: "Instagram DM으로 이마 보톡스 비용 문의" },
      { date: "2026.03.21", title: "리터치 상담 완료", detail: "작년 일본 출장 전 맞은 보톡스 유지 기간 문의" },
      { date: "2025.12.14", title: "보톡스 24U 시술", detail: "원장 단독 시술, 이상반응 없음" },
    ],
    messages: [
      {
        id: "m-1",
        sender: "patient",
        original: "はじめまして。額のボトックスの価格を教えてください。今週予約できますか？",
        translated: "안녕하세요. 이마 보톡스 가격을 알려주세요. 이번 주 예약도 가능할까요?",
        time: "오전 10:12",
      },
      {
        id: "m-2",
        sender: "staff",
        original: "네, 이마 보톡스는 부위와 용량에 따라 15만원에서 30만원 사이입니다. 원하시면 이번 주 가능 시간대도 바로 확인해드릴게요.",
        translated: "はい、額のボトックスは部位と使用量により15万〜30万ウォンです。ご希望でしたら今週のご予約可能時間もすぐご案内いたします。",
        time: "오전 10:14",
      },
      {
        id: "m-3",
        sender: "patient",
        original: "ありがとうございます。痛みは強いですか？",
        translated: "감사합니다. 통증은 많이 강한 편인가요?",
        time: "오전 10:16",
      },
      {
        id: "m-4",
        sender: "patient",
        type: "image",
        original: "参考までに今の額の写真も送ります。",
        translated: "참고용으로 현재 이마 사진도 같이 보내드릴게요.",
        time: "오전 10:17",
        image:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
      },
    ],
    aiSuggestion:
      "통증은 개인차가 있지만 대부분 따끔한 정도로 짧게 끝납니다. 시술 시간도 10분 내외라 부담이 적어요. 원하시면 이번 주 예약 가능한 시간대를 바로 안내드릴까요?",
  },
  {
    id: "conv-2",
    patientName: "Emily Carter",
    avatar: "EC",
    countryFlag: "🇬🇧",
    language: "영어",
    channel: "whatsapp",
    time: "12분 전",
    unread: true,
    status: "pending",
    procedure: "Ulthera",
    preview: "Could you share downtime and pricing for Ulthera full face?",
    lastActive: "오늘 오전 9:41",
    visits: 0,
    stage: "waiting",
    tags: [
      { label: "#신규", tone: "emerald" },
      { label: "#리프팅_고관여", tone: "amber" },
    ],
    notes: [
      "런던에서 5월 방한 예정. 시술 후 바로 미팅 일정이 있어 다운타임 민감.",
    ],
    aftercareSnapshot: [
      { key: "D+1", state: "unset", detail: "예약 확정 후 템플릿 자동 생성" },
      { key: "D+3", state: "unset", detail: "시술 확정 후 세팅" },
    ],
    gallery: [
      {
        id: "g-1",
        label: "Reference Lift",
        type: "reference",
        image:
          "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
      },
    ],
    timeline: [
      { date: "2026.04.07", title: "풀페이스 울쎄라 문의", detail: "WhatsApp로 샷 수, 회복 기간, 가격 문의" },
    ],
    messages: [
      {
        id: "m-1",
        sender: "patient",
        original: "Could you share downtime and pricing for Ulthera full face?",
        translated: "울쎄라 풀페이스의 다운타임과 가격을 알려주실 수 있나요?",
        time: "오전 9:41",
      },
    ],
    aiSuggestion:
      "울쎄라 풀페이스는 샷 수에 따라 보통 120만원부터 250만원 선에서 안내드리고 있습니다. 큰 다운타임은 거의 없지만 일시적인 붉어짐이나 당김은 있을 수 있어요. 원하시면 피부 상태에 맞는 샷 수 기준으로 자세히 안내드릴까요?",
  },
  {
    id: "conv-3",
    patientName: "Noura Al-Sabah",
    avatar: "NA",
    countryFlag: "🇸🇦",
    language: "아랍어",
    channel: "kakao",
    time: "1시간 전",
    unread: false,
    status: "booked",
    procedure: "Skin Booster",
    preview: "شكراً، تم تأكيد الموعد ليوم الجمعة الساعة 3 مساءً",
    lastActive: "오늘 오전 8:15",
    visits: 1,
    stage: "waiting",
    tags: [
      { label: "#VIP", tone: "violet" },
      { label: "#예약확정", tone: "emerald" },
    ],
    notes: [
      "아랍어 응대 선호, 영어 문진도 가능.",
      "동행 1명과 방문 예정.",
    ],
    aftercareSnapshot: [
      { key: "D+1", state: "scheduled", detail: "시술 후 오전 10시 자동 발송" },
      { key: "D+3", state: "scheduled", detail: "컨디션 체크 메시지 세팅 완료" },
    ],
    gallery: [
      {
        id: "g-1",
        label: "Hydration Goal",
        type: "reference",
        image:
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80",
      },
    ],
    timeline: [
      { date: "2026.04.07", title: "금요일 상담 예약 확정", detail: "아랍어 문진 링크 발송" },
      { date: "2026.04.02", title: "스킨부스터 비용 안내", detail: "리쥬란, 샤넬주사 비교 설명" },
    ],
    messages: [
      {
        id: "m-1",
        sender: "patient",
        original: "أود حجز استشارة لحقن سكين بوستر يوم الجمعة.",
        translated: "이번 주 금요일에 스킨부스터 상담 예약을 원합니다.",
        time: "오전 8:02",
      },
      {
        id: "m-2",
        sender: "staff",
        original: "금요일 오후 3시 상담으로 예약 도와드렸습니다. 내원 전에 영어 또는 아랍어 문진 링크도 함께 보내드릴게요.",
        translated: "تم حجز الاستشارة يوم الجمعة الساعة 3 مساءً. سنرسل لك أيضاً رابط الاستبيان قبل الزيارة باللغة الإنجليزية أو العربية.",
        time: "오전 8:09",
      },
      {
        id: "m-3",
        sender: "patient",
        original: "شكراً، تم تأكيد الموعد ليوم الجمعة الساعة 3 مساءً",
        translated: "감사합니다. 금요일 오후 3시로 예약 확인했습니다.",
        time: "오전 8:15",
      },
    ],
    aiSuggestion:
      "예약 확인 감사합니다. 금요일 내원 전 궁금하신 점이 생기시면 언제든지 편하게 메시지 주세요. 원활한 상담을 위해 다국어 문진 링크도 곧 전달드리겠습니다.",
  },
  {
    id: "conv-4",
    patientName: "Mina Lee",
    avatar: "ML",
    countryFlag: "🇰🇷",
    language: "한국어",
    channel: "kakao",
    time: "어제",
    unread: false,
    status: "answered",
    procedure: "Laser Toning",
    preview: "잡티 레이저 토닝 5회 패키지 문의드렸던 고객입니다.",
    lastActive: "어제 오후 5:22",
    visits: 4,
    stage: "completed",
    tags: [
      { label: "#노쇼경고", tone: "red" },
      { label: "#재방문", tone: "brand" },
    ],
    notes: [
      "지난 예약 1회 변경 이력 있음. 평일 오전 선호.",
      "색소 치료 후 보습 제품 구매 관심.",
    ],
    aftercareSnapshot: [
      { key: "D+1", state: "sent", detail: "4월 6일 발송 완료" },
      { key: "D+3", state: "sent", detail: "4월 8일 발송 완료" },
      { key: "D+7", state: "scheduled", detail: "4월 12일 오전 11시" },
    ],
    gallery: [
      {
        id: "g-1",
        label: "Before",
        type: "before",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "g-2",
        label: "After 3 Sessions",
        type: "after",
        image:
          "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80",
      },
    ],
    timeline: [
      { date: "2026.04.01", title: "레이저 토닝 3회차", detail: "색소 경과 양호, D+7 관리 메시지 예정" },
      { date: "2026.03.18", title: "패키지 결제", detail: "5회 패키지 선결제 완료" },
      { date: "2026.03.05", title: "첫 방문 상담", detail: "기미/잡티 복합 색소 상담" },
    ],
    messages: [
      {
        id: "m-1",
        sender: "patient",
        original: "잡티 레이저 토닝 5회 패키지 비용이 궁금해요.",
        translated: "잡티 레이저 토닝 5회 패키지 비용이 궁금해요.",
        time: "어제 오후 5:01",
      },
      {
        id: "m-2",
        sender: "staff",
        original: "5회 패키지는 피부 타입에 따라 55만원부터 안내드리고 있습니다. 방문 상담 시 색소 상태를 보고 더 정확히 제안드릴 수 있어요.",
        translated: "5회 패키지는 피부 타입에 따라 55만원부터 안내드리고 있습니다. 방문 상담 시 색소 상태를 보고 더 정확히 제안드릴 수 있어요.",
        time: "어제 오후 5:05",
      },
    ],
    aiSuggestion:
      "레이저 토닝은 피부 상태에 따라 횟수와 간격이 달라질 수 있어요. 원하시면 현재 피부 고민을 먼저 간단히 보내주시면 가장 적합한 패키지를 안내드리겠습니다.",
  },
];

export const funnelColumns = [
  { id: "new", label: "신규 문의", hint: "첫 응답 5분 이내 목표" },
  { id: "waiting", label: "예약 대기", hint: "상담 전환 집중 관리" },
  { id: "completed", label: "시술 완료", hint: "애프터케어 템플릿 준비" },
  { id: "care", label: "D+7 케어 중", hint: "재방문 및 후기 유도" },
];

export const aftercareRows = [
  {
    id: "af-1",
    patientName: "Airi Sato",
    avatar: "AS",
    countryFlag: "🇯🇵",
    procedure: "보톡스",
    completedAt: "2026.04.06",
    language: "일본어",
    stage: "completed",
    tags: ["#VIP", "#보톡스_관심"],
    nextTemplate: "보톡스 경과 체크",
    statuses: {
      d1: { state: "sent", label: "발송 완료", detail: "오늘 오전 10:30" },
      d3: {
        state: "scheduled",
        label: "발송 대기",
        detail: "내일 오전 11:00",
        tooltip: "施術後3日目です。無理なマッサージは避けてください。気になる違和感があればお写真を送ってください。",
      },
      d7: { state: "unset", label: "미설정" },
    },
  },
  {
    id: "af-2",
    patientName: "Emily Carter",
    avatar: "EC",
    countryFlag: "🇬🇧",
    procedure: "울쎄라",
    completedAt: "2026.04.05",
    language: "영어",
    stage: "care",
    tags: ["#리프팅", "#재상담"],
    nextTemplate: "리프팅 회복 체크",
    statuses: {
      d1: { state: "sent", label: "Sent", detail: "Yesterday 6:20 PM" },
      d3: {
        state: "scheduled",
        label: "Scheduled",
        detail: "Today 2:30 PM",
        tooltip: "Day 3 update: mild tightness is expected and collagen remodeling is ongoing. Please let us know if there is persistent discomfort.",
      },
      d7: {
        state: "scheduled",
        label: "Scheduled",
        detail: "Apr 12, 10:00 AM",
        tooltip: "Week 1 follow-up: your skin may still feel firmer over the coming weeks. We are happy to review photos before your next visit.",
      },
    },
  },
  {
    id: "af-3",
    patientName: "Noura Al-Sabah",
    avatar: "NA",
    countryFlag: "🇸🇦",
    procedure: "스킨부스터",
    completedAt: "2026.04.04",
    language: "아랍어",
    stage: "waiting",
    tags: ["#VIP", "#아랍어"],
    nextTemplate: "예약 리마인드",
    statuses: {
      d1: { state: "sent", label: "تم الإرسال", detail: "어제 오전 9:10" },
      d3: { state: "sent", label: "발송 완료", detail: "오늘 오전 9:05" },
      d7: { state: "unset", label: "미설정" },
    },
  },
  {
    id: "af-4",
    patientName: "Mina Lee",
    avatar: "ML",
    countryFlag: "🇰🇷",
    procedure: "레이저 토닝",
    completedAt: "2026.04.01",
    language: "한국어",
    stage: "new",
    tags: ["#노쇼경고", "#재방문"],
    nextTemplate: "패키지 후속 리마인드",
    statuses: {
      d1: { state: "sent", label: "발송 완료", detail: "4월 2일 오전 10:00" },
      d3: { state: "sent", label: "발송 완료", detail: "4월 4일 오전 10:00" },
      d7: {
        state: "scheduled",
        label: "발송 대기",
        detail: "4월 8일 오전 11:00",
        tooltip: "레이저 후 보습과 자외선 차단은 계속 유지해 주세요. 추가 색소 변화가 있으면 사진과 함께 답장 부탁드립니다.",
      },
    },
  },
];

export const stats = {
  responseRate: "97.4%",
  avgReplyTime: "4분 12초",
  converted: "31건",
  languages: "12개 언어",
};
