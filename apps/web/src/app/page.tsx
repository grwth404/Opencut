import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../components/ui/resizable";
import { MediaPanel } from "../components/media-panel";
import { PropertiesPanel } from "../components/properties-panel";
import { Timeline } from "../components/timeline";
import { PreviewPanel } from "../components/preview-panel";

export default function VideoEditor() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={50} minSize={30}>
          {/* Main content area */}
          <ResizablePanelGroup direction="horizontal">
            {/* Tools Panel */}
            <ResizablePanel defaultSize={20} minSize={15}>
              <MediaPanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Preview Area */}
            <ResizablePanel defaultSize={60}>
              <PreviewPanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Properties Panel */}
            <ResizablePanel defaultSize={20} minSize={15}>
              <PropertiesPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Timeline */}
        <ResizablePanel defaultSize={50} minSize={15}>
          <Timeline />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
