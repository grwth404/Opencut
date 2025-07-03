"use client";

import { cn } from "@/lib/utils";
import { Tab, tabs, useMediaPanelStore } from "./store";

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();

  return (
    <div className="h-12 bg-accent/50 px-3 flex justify-start items-center gap-6">
      {(Object.keys(tabs) as Tab[]).map((tabKey) => {
        const tab = tabs[tabKey];
        return (
          <div
            className={cn(
              "flex flex-col gap-0.5 items-center cursor-pointer",
              activeTab === tabKey ? "text-primary" : "text-muted-foreground"
            )}
            onClick={() => setActiveTab(tabKey)}
            key={tabKey}
          >
            <tab.icon className="!size-5" />
            <span className="text-[0.65rem]">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
