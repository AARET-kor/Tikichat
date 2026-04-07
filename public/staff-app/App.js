import { html, useMemo, useState } from "./lib.js";
import { aftercareRows, conversationsSeed, funnelColumns, stats } from "./data.js";
import { AftercareBoard } from "./components/AftercareBoard.js";
import { ChatList } from "./components/ChatList.js";
import { ChatWindow } from "./components/ChatWindow.js";
import { PatientContextPanel } from "./components/PatientContextPanel.js";
import { SidebarNav } from "./components/SidebarNav.js";
import { StatsView } from "./components/StatsView.js";
import { TopBar } from "./components/TopBar.js";

function applyFilter(items, filter) {
  if (filter === "pending") return items.filter((item) => item.status === "pending");
  if (filter === "booked") return items.filter((item) => item.status === "booked");
  return items;
}

export function App() {
  const [activeView, setActiveView] = useState("consult");
  const [filter, setFilter] = useState("all");
  const [conversations, setConversations] = useState(conversationsSeed);
  const [aftercareItems, setAftercareItems] = useState(aftercareRows);
  const [activeConversationId, setActiveConversationId] = useState(conversationsSeed[0].id);
  const [draft, setDraft] = useState("");
  const [galleryIndex, setGalleryIndex] = useState(0);

  const filteredConversations = useMemo(
    () => applyFilter(conversations, filter),
    [conversations, filter]
  );

  const activeConversation =
    filteredConversations.find((item) => item.id === activeConversationId) ||
    filteredConversations[0] ||
    null;

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    const nextItems = applyFilter(conversations, nextFilter);
    if (nextItems.length > 0) setActiveConversationId(nextItems[0].id);
    setDraft("");
    setGalleryIndex(0);
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setDraft("");
    setGalleryIndex(0);
  };

  const injectSuggestion = () => {
    if (!activeConversation) return;
    setDraft(activeConversation.aiSuggestion);
  };

  const sendMessage = () => {
    if (!activeConversation) return;
    const messageText = draft.trim() || activeConversation.aiSuggestion;

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeConversation.id) return conversation;
        return {
          ...conversation,
          unread: false,
          status: conversation.status === "pending" ? "answered" : conversation.status,
          preview: messageText,
          time: "방금 전",
          messages: [
            ...conversation.messages,
            {
              id: `m-${conversation.messages.length + 1}`,
              sender: "staff",
              original: messageText,
              translated: `${conversation.language}로 자동 번역되어 발송됨`,
              time: "방금 전",
            },
          ],
        };
      })
    );

    setDraft("");
  };

  const saveImageToGallery = (message) => {
    if (!activeConversation || !message.image) return;
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeConversation.id) return conversation;
        const alreadyExists = conversation.gallery.some((item) => item.image === message.image);
        if (alreadyExists) return conversation;
        return {
          ...conversation,
          gallery: [
            {
              id: `g-${conversation.gallery.length + 1}`,
              label: "Saved from Chat",
              type: "patient-upload",
              image: message.image,
            },
            ...conversation.gallery,
          ],
          notes: ["환자 채팅에서 받은 사진을 차트에 저장함.", ...conversation.notes],
        };
      })
    );
    setGalleryIndex(0);
  };

  const moveAftercareCard = (cardId, nextStage) => {
    const nextTemplateMap = {
      new: "첫 응답 및 관심 부위 확인",
      waiting: "예약 리마인드 및 내원 안내",
      completed: "시술 직후 애프터케어 템플릿",
      care: "D+7 경과 체크 및 재방문 제안",
    };
    setAftercareItems((current) =>
      current.map((item) =>
        item.id === cardId
          ? { ...item, stage: nextStage, nextTemplate: nextTemplateMap[nextStage] }
          : item
      )
    );
  };

  const showPrevGallery = () => {
    if (!activeConversation) return;
    setGalleryIndex((current) =>
      current === 0 ? activeConversation.gallery.length - 1 : current - 1
    );
  };

  const showNextGallery = () => {
    if (!activeConversation) return;
    setGalleryIndex((current) =>
      current === activeConversation.gallery.length - 1 ? 0 : current + 1
    );
  };

  return html`
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid-shell h-screen">
        <${SidebarNav} activeView=${activeView} onChange=${setActiveView} />

        ${activeView === "consult"
          ? html`
              <${ChatList}
                allConversations=${conversations}
                conversations=${filteredConversations}
                activeConversationId=${activeConversationId}
                activeFilter=${filter}
                onFilterChange=${handleFilterChange}
                onSelectConversation=${handleSelectConversation}
              />
            `
          : html`<div className="border-r border-slate-200 bg-white"></div>`}

        ${activeView === "consult"
          ? html`
              <main className="flex h-screen min-w-0 flex-col overflow-hidden">
                <${TopBar} />
                <div className="min-h-0 flex-1">
                  <${ChatWindow}
                    conversation=${activeConversation}
                    draft=${draft}
                    onDraftChange=${setDraft}
                    onInjectSuggestion=${injectSuggestion}
                    onSend=${sendMessage}
                    onSaveImage=${saveImageToGallery}
                  />
                </div>
              </main>

              <${PatientContextPanel}
                conversation=${activeConversation}
                galleryIndex=${galleryIndex}
                onPrevGallery=${showPrevGallery}
                onNextGallery=${showNextGallery}
              />
            `
          : html`
              <main className="col-span-2 flex h-screen flex-col overflow-hidden">
                <${TopBar} />
                <div className="min-h-0 flex-1">
                  ${activeView === "aftercare"
                    ? html`
                        <${AftercareBoard}
                          rows=${aftercareItems}
                          columns=${funnelColumns}
                          onMoveCard=${moveAftercareCard}
                        />
                      `
                    : html`<${StatsView} stats=${stats} />`}
                </div>
              </main>
            `}
      </div>
    </div>
  `;
}
