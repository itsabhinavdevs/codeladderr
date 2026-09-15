const PLATFORMS = [
  { test: /leetcode\.com/i, name: "LeetCode", icon: `<img src="/assets/icons/leetcode.svg" alt="" />` },
  { test: /geeksforgeeks\.org/i, name: "GeeksforGeeks", icon: `<img src="/assets/icons/gfg.svg" alt="" />` },
  { test: /youtu\.?be/i, name: "YouTube", icon: `<img src="/assets/icons/yt.svg" alt="" />` },
  { test: /takeuforward\.org/i, name: "takeUforward", icon: `<img src="/assets/icons/tuf.svg" alt="" />` },
  // add more domains here as needed
];

export function getPlatformIcon(url) {
  const match = PLATFORMS.find((p) => p.test.test(url));
  return match ? match.icon : `<span class="problem-row__generic-icon">↗</span>`;
}

export function getPlatformName(url) {
  const match = PLATFORMS.find((p) => p.test.test(url));
  return match ? match.name : "Link";
}
