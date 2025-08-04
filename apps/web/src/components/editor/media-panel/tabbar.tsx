"use client";

import { cn } from "@/lib/utils";
import { Tab, tabs, useMediaPanelStore } from "./store";

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();

  return (
    <div className="flex">
      <div className="h-full px-4 flex flex-col justify-start items-center gap-5 overflow-x-auto scrollbar-x-hidden relative w-full py-4">
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          return (
            <div
              className={cn(
                "flex flex-col gap-0.5 items-center cursor-pointer opacity-100 hover:opacity-75",
                activeTab === tabKey
                  ? "text-primary !opacity-100"
                  : "text-muted-foreground"
              )}
              onClick={() => setActiveTab(tabKey)}
              key={tabKey}
            >
              <tab.icon className="size-[1.1rem]!" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
