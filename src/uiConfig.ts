// UI configuration for EcoQuest Live

export const UI = {
  trendWindowDays: 1,             // compare to prior 24h
  closeGapThreshold: 1.5,         // pts
  maxCloseClusters: 3,
  showAliases: false,
  aliases: {} as Record<string, string>,  // later we can fill
};
