import { create } from "zustand";
import { Query, User } from "../utils/sheets";

interface TooltipState {
  activeInstanceId: string | null;
  position: { top: number; left: number };
  placement: "top" | "bottom";
  query: Query | null;
  users: User[];
  showTooltip: (
    instanceId: string,
    query: Query,
    users: User[],
    position: { top: number; left: number },
    placement: "top" | "bottom",
  ) => void;
  hideTooltip: () => void;
}

export const useTooltipStore = create<TooltipState>((set) => ({
  activeInstanceId: null,
  position: { top: 0, left: 0 },
  placement: "top",
  query: null,
  users: [],
  showTooltip: (instanceId, query, users, position, placement) =>
    set({ activeInstanceId: instanceId, query, users, position, placement }),
  hideTooltip: () =>
    set({
      activeInstanceId: null,
      query: null,
      users: [],
      position: { top: 0, left: 0 },
      placement: "top",
    }),
}));
