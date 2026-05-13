(function () {
window.GeoMaster = window.GeoMaster || {};

const textAdapter = {
  renderMode({ elements, mode }) {
    elements.gameMode.textContent = mode.label;
    elements.guessPrompt.textContent = mode.prompt;
    elements.submit.textContent = mode.primaryActionLabel;
    elements.submit.hidden = false;
    elements.guess.type = mode.inputKind || "text";
    elements.guess.disabled = false;
    elements.guessField.hidden = false;
    elements.choicePanel.hidden = true;
    elements.choicePanel.replaceChildren();
    elements.guessPanel.classList.remove("is-choice-mode");
  },

  renderRound({ elements, country, revealedIndexes, renderHint }) {
    elements.hint.hidden = false;
    renderHint(elements.hint, country, revealedIndexes);
    elements.guess.disabled = false;
    elements.submit.disabled = false;
    elements.submit.hidden = false;
    elements.guessField.hidden = false;
    elements.choicePanel.hidden = true;
    elements.choicePanel.replaceChildren();
  },

  disable({ elements }) {
    elements.guess.disabled = true;
    elements.submit.disabled = true;
  },

  focus({ elements }) {
    elements.guess.focus();
  },

  cleanup({ elements }) {
    elements.choicePanel.replaceChildren();
  },
};

const choiceAdapter = {
  renderMode({ elements, mode }) {
    elements.gameMode.textContent = mode.label;
    elements.guessPrompt.textContent = mode.prompt;
    elements.submit.textContent = mode.primaryActionLabel;
    elements.submit.hidden = true;
    elements.guess.type = "text";
    elements.guess.disabled = true;
    elements.guessField.hidden = true;
    elements.choicePanel.hidden = false;
    elements.choicePanel.replaceChildren();
    elements.guessPanel.classList.add("is-choice-mode");
  },

  renderRound({ elements, choices, onChoice }) {
    elements.hint.hidden = true;
    elements.hint.replaceChildren();
    elements.guessField.hidden = true;
    elements.submit.hidden = true;
    elements.guess.disabled = true;
    elements.choicePanel.hidden = false;
    elements.choicePanel.replaceChildren();

    choices.forEach((choice, index) => {
      const button = document.createElement("button");
      const indexElement = document.createElement("span");
      const labelElement = document.createElement("span");

      button.className = "choice-button";
      button.type = "button";
      button.value = choice;
      indexElement.className = "choice-index";
      indexElement.textContent = String.fromCharCode(65 + index);
      labelElement.className = "choice-label";
      labelElement.textContent = choice;
      button.append(indexElement, labelElement);
      button.addEventListener("click", () => onChoice(choice, button));
      elements.choicePanel.appendChild(button);
    });
  },

  disable({ elements }) {
    [...elements.choicePanel.querySelectorAll(".choice-button")].forEach((button) => {
      button.disabled = true;
    });
  },

  lock({ elements, selectedButton }) {
    [...elements.choicePanel.querySelectorAll(".choice-button")].forEach((button) => {
      button.disabled = true;
      button.classList.remove("is-answer");
      button.classList.toggle("is-dimmed", button !== selectedButton);
    });
  },

  revealAnswer({ elements, country, selectedButton = null }) {
    [...elements.choicePanel.querySelectorAll(".choice-button")].forEach((button) => {
      const isAnswer = button.value === country;

      button.disabled = true;
      button.classList.toggle("is-answer", isAnswer);
      button.classList.toggle("is-dimmed", !isAnswer && button !== selectedButton);
    });
  },

  focus({ elements }) {
    elements.choicePanel.querySelector(".choice-button")?.focus();
  },

  cleanup({ elements }) {
    elements.choicePanel.replaceChildren();
  },
};

function getModeUiAdapter(mode) {
  return mode.inputKind === "choice" ? choiceAdapter : textAdapter;
}

window.GeoMaster.modeUiAdapters = {
  getModeUiAdapter,
};
})();
