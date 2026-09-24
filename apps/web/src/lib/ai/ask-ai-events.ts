// Window events so any component can open or close the one Ask AI dialog
// without importing it (the dialog renders the chat, which would be circular).
export const ASK_AI_OPEN_EVENT = "ask-ai:open";
export const ASK_AI_CLOSE_EVENT = "ask-ai:close";

/** Opens the Ask AI dialog from anywhere, e.g. the mobile drawer. */
export function openAskAi() {
  window.dispatchEvent(new Event(ASK_AI_OPEN_EVENT));
}

/** Closes the dialog, e.g. when an answer's link navigates to a doc page. */
export function closeAskAi() {
  window.dispatchEvent(new Event(ASK_AI_CLOSE_EVENT));
}
