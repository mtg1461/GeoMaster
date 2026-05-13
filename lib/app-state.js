(function () {
window.GeoMaster = window.GeoMaster || {};

const APP_STATES = {
  HUB: "hub",
  SETUP: "setup",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "game-over",
};

class StateMachine {
  constructor(initialState) {
    this.state = initialState;
  }

  set(nextState) {
    this.state = nextState;
    return this.state;
  }

  is(state) {
    return this.state === state;
  }
}

window.GeoMaster.appState = {
  APP_STATES,
  StateMachine,
};
})();
