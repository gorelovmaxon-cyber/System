"use strict";

const openButton = document.querySelector("#notice-open");
const closeButton = document.querySelector("#notice-close");
const notice = document.querySelector("#notice");

openButton.addEventListener("click", () => notice.showModal());
closeButton.addEventListener("click", () => notice.close());
notice.addEventListener("close", () => openButton.focus());

// The notification has one focusable control. Keep both Tab directions on it.
notice.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    closeButton.focus();
  }
});
