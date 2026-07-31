(function () {
window.GeoMaster = window.GeoMaster || {};

function setFlagChoiceMode(elements, isFlagChoice) {
  elements.guessPanel.classList.toggle("is-flag-choice-mode", isFlagChoice);
  elements.choicePanel.classList.toggle("is-flag-choice", isFlagChoice);
  elements.choicePanel.classList.remove("is-flag-fallback");

  if (!isFlagChoice) {
    elements.choicePanel.removeAttribute("aria-label");
    elements.choicePanel.removeAttribute("role");
    elements.choiceStatus = null;
  }
}

const textAdapter = {
  renderMode({ elements, mode }) {
    setFlagChoiceMode(elements, false);
    elements.gameMode.textContent = mode.label;
    elements.guessPrompt.textContent = mode.prompt;
    elements.submit.textContent = mode.primaryActionLabel;
    elements.submit.hidden = false;
    elements.guess.type = mode.inputKind || "text";
    elements.guess.disabled = false;
    elements.guessField.hidden = false;
    elements.choicePanel.hidden = true;
    elements.choicePanel.replaceChildren();
    elements.mapClickPrompt.hidden = true;
    elements.mapClickPrompt.textContent = "";
    elements.guessPanel.classList.remove("is-choice-mode");
    elements.guessPanel.classList.remove("is-map-click-mode");
    elements.answerPanel.hidden = false;
    elements.answerPanel.classList.remove("is-floating-prompt");
    elements.hint.classList.remove("is-map-click-prompt");
  },

  renderRound({ elements, country, revealedIndexes, renderHint }) {
    elements.hint.hidden = false;
    elements.hint.classList.remove("is-map-click-prompt");
    renderHint(elements.hint, country, revealedIndexes);
    elements.guess.disabled = false;
    elements.submit.disabled = false;
    elements.submit.hidden = false;
    elements.guessField.hidden = false;
    elements.choicePanel.hidden = true;
    elements.choicePanel.replaceChildren();
    elements.mapClickPrompt.hidden = true;
    elements.mapClickPrompt.textContent = "";
  },

  disable({ elements }) {
    elements.guess.disabled = true;
    elements.submit.disabled = true;
  },

  focus({ elements }) {
    elements.guess.focus();
  },

  cleanup({ elements }) {
    setFlagChoiceMode(elements, false);
    elements.choicePanel.replaceChildren();
    elements.choiceButtons = [];
  },
};

function getOptionLetter(index) {
  return String.fromCharCode(65 + index);
}

function setChoiceStatus(elements, message) {
  const status = elements.choiceStatus;

  if (!status) {
    return;
  }

  status.textContent = "";
  const announce = () => {
    if (elements.choiceStatus === status) {
      status.textContent = message;
    }
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(announce);
  } else {
    window.setTimeout(announce, 0);
  }
}

function getFlagMetadata(country) {
  return window.GeoMaster.countryFlags?.getFlag(country) || null;
}

function revealFlagChoiceLabel(button, outcomeLabel) {
  const label = button.querySelector(".flag-caption");
  const status = button.querySelector(".flag-status");
  const optionLetter = button.dataset.optionLetter;
  const statusText = status?.textContent?.trim();
  const statusDescription = getFlagMetadata(button.value)?.statusDescription || statusText;
  const accessibleStatus = statusDescription ? `. ${statusDescription}` : "";

  button.classList.add("is-label-visible");
  label?.setAttribute("aria-hidden", "false");
  status?.setAttribute("aria-hidden", "false");
  button.setAttribute(
    "aria-label",
    `Option ${optionLetter}, ${button.value}, ${outcomeLabel}${accessibleStatus}`,
  );
}

function enableFlagFallback(elements, roundStatus) {
  if (
    elements.choiceStatus !== roundStatus
    || !elements.choicePanel.classList.contains("is-flag-choice")
    || elements.choicePanel.classList.contains("is-flag-fallback")
  ) {
    return;
  }

  elements.choicePanel.classList.add("is-flag-fallback");
  (elements.choiceButtons || []).forEach((button) => {
    const label = button.querySelector(".flag-caption");
    const image = button.querySelector(".flag-image");

    button.classList.add("is-label-visible");
    label?.setAttribute("aria-hidden", "false");
    image?.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-label", `Option ${button.dataset.optionLetter}, ${button.value}`);
  });
  setChoiceStatus(elements, "A flag image failed to load. This round is using country names.");
}

function createTextChoice({ choice, index, onChoice }) {
  const button = document.createElement("button");
  const indexElement = document.createElement("span");
  const labelElement = document.createElement("span");

  button.className = "choice-button";
  button.type = "button";
  button.value = choice;
  indexElement.className = "choice-index";
  indexElement.textContent = getOptionLetter(index);
  labelElement.className = "choice-label";
  labelElement.textContent = choice;
  button.append(indexElement, labelElement);
  button.addEventListener("click", () => onChoice(choice, button));
  return button;
}

function createFlagChoice({ choice, elements, index, onChoice }) {
  const button = document.createElement("button");
  const indexElement = document.createElement("span");
  const frame = document.createElement("span");
  const image = document.createElement("img");
  const answerElement = document.createElement("span");
  const labelElement = document.createElement("span");
  const statusElement = document.createElement("span");
  const optionLetter = getOptionLetter(index);
  const flag = getFlagMetadata(choice);
  const roundStatus = elements.choiceStatus;

  button.className = "choice-button choice-button--flag";
  button.type = "button";
  button.value = choice;
  button.dataset.optionLetter = optionLetter;
  button.setAttribute("aria-label", `Flag option ${optionLetter}`);
  indexElement.className = "choice-index";
  indexElement.textContent = optionLetter;
  frame.className = "flag-frame";
  image.className = "flag-image";
  image.alt = "";
  image.width = 300;
  image.height = 200;
  image.loading = "eager";
  image.decoding = "async";
  image.setAttribute("aria-hidden", "true");
  answerElement.className = "flag-answer";
  labelElement.className = "choice-label flag-caption";
  labelElement.textContent = choice;
  labelElement.setAttribute("aria-hidden", "true");
  statusElement.className = "flag-status";
  statusElement.textContent = flag?.statusLabel || "";
  statusElement.setAttribute("aria-hidden", "true");

  if (flag) {
    image.src = flag.src;
    image.addEventListener("error", () => enableFlagFallback(elements, roundStatus), { once: true });
  } else {
    image.removeAttribute("src");
    window.setTimeout(() => enableFlagFallback(elements, roundStatus), 0);
  }

  answerElement.append(labelElement, statusElement);
  frame.append(image, answerElement);
  button.append(indexElement, frame);
  button.addEventListener("click", () => onChoice(choice, button));
  return button;
}

function getFlagOutcomeMessage(country, selectedButton, outcome) {
  const answerMetadata = getFlagMetadata(country);
  const answerStatus = answerMetadata?.statusDescription || answerMetadata?.statusLabel;
  const statusSuffix = answerStatus ? ` ${answerStatus}` : "";

  if (outcome === "correct") {
    return `Correct. ${country}.${statusSuffix}`;
  }

  if (outcome === "wrong" && selectedButton) {
    return `Incorrect. You chose ${selectedButton.value}. The correct answer is ${country}.${statusSuffix}`;
  }

  if (outcome === "skip") {
    return `Skipped. The correct answer is ${country}.${statusSuffix}`;
  }

  return `Time expired. The correct answer is ${country}.${statusSuffix}`;
}

const multipleChoiceAdapter = {
  renderMode({ elements, mode }) {
    const isFlagChoice = mode.choicePresentation === "flag";

    setFlagChoiceMode(elements, isFlagChoice);
    elements.gameMode.textContent = mode.label;
    elements.guessPrompt.textContent = mode.prompt;
    elements.submit.textContent = mode.primaryActionLabel;
    elements.submit.hidden = true;
    elements.guess.type = "text";
    elements.guess.disabled = true;
    elements.guessField.hidden = true;
    elements.choicePanel.hidden = false;
    elements.choicePanel.replaceChildren();
    elements.mapClickPrompt.hidden = true;
    elements.mapClickPrompt.textContent = "";
    elements.guessPanel.classList.add("is-choice-mode");
    elements.guessPanel.classList.remove("is-map-click-mode");
    elements.answerPanel.hidden = true;
    elements.answerPanel.classList.remove("is-floating-prompt");
    elements.hint.classList.remove("is-map-click-prompt");
  },

  renderRound({ elements, choices, mode, onChoice }) {
    const isFlagChoice = mode.choicePresentation === "flag";

    setFlagChoiceMode(elements, isFlagChoice);
    elements.hint.hidden = true;
    elements.hint.replaceChildren();
    elements.guessField.hidden = true;
    elements.submit.hidden = true;
    elements.guess.disabled = true;
    elements.choicePanel.hidden = false;
    elements.mapClickPrompt.hidden = true;
    elements.mapClickPrompt.textContent = "";
    elements.choicePanel.replaceChildren();
    elements.choiceButtons = [];

    if (isFlagChoice) {
      const instruction = document.createElement("p");
      const status = document.createElement("p");

      instruction.className = "choice-instruction";
      instruction.textContent = mode.prompt;
      status.className = "choice-status visually-hidden";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      elements.choicePanel.setAttribute("aria-label", mode.prompt);
      elements.choicePanel.setAttribute("role", "group");
      elements.choiceStatus = status;
      elements.choicePanel.appendChild(instruction);
    }

    choices.forEach((choice, index) => {
      const button = isFlagChoice
        ? createFlagChoice({ choice, elements, index, onChoice })
        : createTextChoice({ choice, index, onChoice });

      elements.choicePanel.appendChild(button);
      elements.choiceButtons.push(button);
    });

    if (isFlagChoice) {
      elements.choicePanel.appendChild(elements.choiceStatus);
    }
  },

  disable({ elements }) {
    (elements.choiceButtons || []).forEach((button) => {
      button.disabled = true;
    });
  },

  lock({ elements, selectedButton }) {
    (elements.choiceButtons || []).forEach((button) => {
      button.disabled = true;
      button.classList.remove("is-answer");
      button.classList.toggle("is-dimmed", button !== selectedButton);
    });
  },

  revealAnswer({ elements, country, outcome = "answer", selectedButton = null }) {
    const isFlagChoice = elements.choicePanel.classList.contains("is-flag-choice");

    (elements.choiceButtons || []).forEach((button) => {
      const isAnswer = button.value === country;
      const isSelectedWrong = button === selectedButton && !isAnswer;

      button.disabled = true;
      button.classList.toggle("is-answer", isAnswer);
      button.classList.toggle("is-dimmed", !isAnswer && button !== selectedButton);

      if (!isFlagChoice || (!isAnswer && !isSelectedWrong)) {
        return;
      }

      if (isAnswer && selectedButton === button && outcome === "correct") {
        revealFlagChoiceLabel(button, "correct");
      } else if (isAnswer) {
        revealFlagChoiceLabel(button, "correct answer");
      } else {
        revealFlagChoiceLabel(button, "your incorrect choice");
      }
    });

    if (isFlagChoice) {
      setChoiceStatus(elements, getFlagOutcomeMessage(country, selectedButton, outcome));
    }
  },

  focus({ elements }) {
    elements.choiceButtons?.[0]?.focus();
  },

  cleanup({ elements }) {
    setFlagChoiceMode(elements, false);
    elements.choicePanel.replaceChildren();
    elements.choiceButtons = [];
  },
};

const mapClickAdapter = {
  renderMode({ elements, mode }) {
    setFlagChoiceMode(elements, false);
    elements.gameMode.textContent = mode.label;
    elements.guessPrompt.textContent = mode.prompt;
    elements.submit.textContent = mode.primaryActionLabel;
    elements.submit.hidden = true;
    elements.guess.disabled = true;
    elements.guessField.hidden = true;
    elements.choicePanel.hidden = true;
    elements.choicePanel.replaceChildren();
    elements.mapClickPrompt.hidden = true;
    elements.mapClickPrompt.textContent = "";
    elements.guessPanel.classList.remove("is-choice-mode");
    elements.guessPanel.classList.add("is-map-click-mode");
    elements.answerPanel.hidden = true;
    elements.answerPanel.classList.remove("is-floating-prompt");
  },

  renderRound({ elements, country }) {
    elements.hint.hidden = true;
    elements.hint.replaceChildren();
    elements.hint.classList.remove("is-map-click-prompt");
    elements.mapClickPrompt.hidden = false;
    elements.mapClickPrompt.textContent = country;
    elements.guessField.hidden = true;
    elements.submit.hidden = true;
    elements.guess.disabled = true;
    elements.choicePanel.hidden = true;
    elements.choicePanel.replaceChildren();
  },

  disable() {},

  focus() {},

  cleanup({ elements }) {
    setFlagChoiceMode(elements, false);
    elements.hint.classList.remove("is-map-click-prompt");
    elements.mapClickPrompt.hidden = true;
    elements.mapClickPrompt.textContent = "";
    elements.choicePanel.replaceChildren();
    elements.choiceButtons = [];
    elements.guessPanel.classList.remove("is-map-click-mode");
    elements.answerPanel.classList.remove("is-floating-prompt");
  },
};

function getModeUiAdapter(mode) {
  if (mode.inputKind === "multiple-choice") {
    return multipleChoiceAdapter;
  }

  if (mode.inputKind === "map-click") {
    return mapClickAdapter;
  }

  return textAdapter;
}

window.GeoMaster.modeUiAdapters = {
  getModeUiAdapter,
};
})();
