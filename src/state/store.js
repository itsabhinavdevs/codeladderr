let state = {
  user: null,
  theme: "dark",
  currentSection: null,
  streak: 0,
  todayContributionCount: 0,
};

const subscribers = new Set();

export function getState() {
  return state;
}

export function setState(partial) {
  state = { ...state, ...partial };
  subscribers.forEach((callback) => callback(state));
}

export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
