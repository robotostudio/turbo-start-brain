export const ASK_AI_OPEN_EVENT = "ask-ai:open";
export const ASK_AI_CLOSE_EVENT = "ask-ai:close";

export function openAskAi() {
  window.dispatchEvent(new Event(ASK_AI_OPEN_EVENT));
}

export function closeAskAi() {
  window.dispatchEvent(new Event(ASK_AI_CLOSE_EVENT));
}
