import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../utils/cn";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import { useSettingsStore } from "../../store/useSettingsStore";

// Main Tabs root
const Tabs = TabsPrimitive.Root;

// Tab trigger with optional badge
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  badge?: string | number;
  badgeColor?: string;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, disabled, badge, badgeColor = "bg-red", children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-field data-[state=active]:text-font-1 data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-md gap-2 h-full relative z-10 data-[state=active]:z-20",
      className
    )}
    disabled={disabled}
    {...props}
  >
    {children}
    {badge !== undefined && badge !== null && badge !== 0 && badge !== "0" && (
      <span
        className={cn(
          "flex items-center justify-center text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full tabular-nums shadow-sm",
          badgeColor
        )}
      >
        {badge}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// Tabs content wrapper
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-2 focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// Utility debounce function
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// TabsList component with responsive dropdown collapse
const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [shouldCollapse, setShouldCollapse] = React.useState(false);
  const { settings } = useSettingsStore();
  const uiScale = settings.uiScale || 1;

  // Forward ref
  React.useImperativeHandle(ref, () => listRef.current!);

  // Check overflow
  const checkOverflow = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    // Add small buffer to prevent tiny collisions
    const buffer = 10;
    setShouldCollapse(el.scrollWidth > el.clientWidth + buffer);
  }, []);

  // Debounced resize handler
  React.useEffect(() => {
    checkOverflow();
    const debounced = debounce(checkOverflow, 50);

    window.addEventListener("resize", debounced);
    const resizeObserver = new ResizeObserver(debounced);
    if (listRef.current) resizeObserver.observe(listRef.current);

    return () => {
      window.removeEventListener("resize", debounced);
      resizeObserver.disconnect();
    };
  }, [checkOverflow, uiScale, children]);

  const triggers = React.Children.toArray(children) as React.ReactElement[];

  return shouldCollapse ? (
    <div
      className={cn(
        "tabs-dropdown-container inline-flex h-10 items-center justify-center rounded-lg bg-transparent p-1 text-font-2 backdrop-blur-lg border border-border shadow-sm",
        className
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all hover:bg-field hover:text-font-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">More tabs</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {triggers.map((trigger, index) => {
            const badge = trigger.props.badge;
            const badgeColor = trigger.props.badgeColor || "bg-red";

            return (
              <DropdownMenuItem
                key={index}
                onClick={() => {
                  trigger.props.onClick?.(new MouseEvent("click"));
                  listRef.current?.querySelector(`[data-state="active"]`)?.click();
                }}
                className={cn(
                  "flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-white focus:bg-accent focus:text-white gap-2",
                  trigger.props.className
                )}
              >
                {trigger.props.children}
                {badge !== undefined && badge !== null && badge !== 0 && badge !== "0" && (
                  <span
                    className={cn(
                      "flex items-center justify-center text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full tabular-nums shadow-sm ml-auto",
                      badgeColor
                    )}
                  >
                    {badge}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden functional list to maintain Radix context */}
      <TabsPrimitive.List ref={listRef} style={{ display: "none" }} {...props}>
        {children}
      </TabsPrimitive.List>
    </div>
  ) : (
    <TabsPrimitive.List
      ref={listRef}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-transparent p-1 text-font-2 backdrop-blur-lg border border-border shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = "TabsList";

// High-level TabsComponent for simpler usage
const TabsComponent = ({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; badge?: string | number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) => (
  <Tabs value={activeTab} onValueChange={onChange} className={className}>
    <TabsList>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id} badge={tab.badge}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

export default TabsComponent;
export { Tabs, TabsList, TabsTrigger, TabsContent };