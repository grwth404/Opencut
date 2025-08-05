import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BaseViewProps {
  children?: React.ReactNode;
  defaultTab?: string;
  tabs?: {
    value: string;
    label: string;
    content: React.ReactNode;
  }[];
  className?: string;
}

function ViewContent({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-5">{children}</div>
    </ScrollArea>
  );
}

export function BaseView({
  children,
  defaultTab,
  tabs,
  className = "",
}: BaseViewProps) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {!tabs || tabs.length === 0 ? (
        <ViewContent>{children}</ViewContent>
      ) : (
        <Tabs defaultValue={defaultTab} className="flex flex-col h-full">
          <div className="px-3 pt-4 pb-0">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Separator className="mt-4" />
          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-0 flex-1 flex flex-col min-h-0"
            >
              <ViewContent>{tab.content}</ViewContent>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
