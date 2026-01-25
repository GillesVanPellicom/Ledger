import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "../../utils/cn"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./DropdownMenu"
import { useSettingsStore } from "../../store/useSettingsStore"

const Tabs = TabsPrimitive.Root

// Helper component for measuring tab width without triggering Radix context errors
const MeasureTab = ({ className, badge, badgeColor = 'bg-red', children }: any) => (
  <div
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1 text-sm font-medium transition-all gap-2 h-full relative z-10",
      className
    )}
  >
    {children}
    {badge !== undefined && badge !== null && badge !== 0 && badge !== "0" && (
      <span className={cn(
        "flex items-center justify-center text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full tabular-nums shadow-sm",
        badgeColor
      )}>
        {badge}
      </span>
    )}
  </div>
);

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();
  const uiScale = settings.uiScale || 1;

  // Combine forwarded ref and local ref
  React.useImperativeHandle(ref, () => listRef.current!);

  const [shouldCollapse, setShouldCollapse] = React.useState(false);
  const measureRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const handleResize = () => {
      if (!listRef.current || !measureRef.current) return;
      
      const requiredWidth = measureRef.current.scrollWidth;
      
      // Find the OuterHeader (justify-between container)
      let current = listRef.current.parentElement;
      let outerHeader: HTMLElement | null = null;
      
      while (current) {
        const style = window.getComputedStyle(current);
        if (style.justifyContent === 'space-between') {
          outerHeader = current;
          break;
        }
        current = current.parentElement;
      }
      
      if (!outerHeader) return;
      
      // Find the FlexContainer (child of OuterHeader that contains our TabsList)
      let headerChild = listRef.current.parentElement;
      while (headerChild && headerChild.parentElement !== outerHeader) {
        headerChild = headerChild.parentElement;
      }
      
      if (!headerChild) return;
      
      // 1. Calculate available width in OuterHeader for headerChild
      const outerRect = outerHeader.getBoundingClientRect();
      const outerStyle = window.getComputedStyle(outerHeader);
      const paddingX = parseFloat(outerStyle.paddingLeft) + parseFloat(outerStyle.paddingRight);
      
      let siblingsWidth = 0;
      const outerChildren = Array.from(outerHeader.children);
      outerChildren.forEach(child => {
        if (child !== headerChild) {
          siblingsWidth += child.getBoundingClientRect().width;
        }
      });
      
      const maxHeaderChildWidth = outerRect.width - paddingX - siblingsWidth - 40; // 40px buffer
      
      // 2. Calculate used space by siblings within the hierarchy up to headerChild
      let usedSpace = 0;
      let currentLevel = listRef.current;
      
      while (currentLevel && currentLevel !== outerHeader) {
         const parent = currentLevel.parentElement;
         if (!parent) break;
         
         const children = Array.from(parent.children);
         const style = window.getComputedStyle(parent);
         const gap = parseFloat(style.gap) || 0;
         
         let levelUsedWidth = 0;
         let relativeChildrenCount = 0;
         
         children.forEach(child => {
            const childStyle = window.getComputedStyle(child);
            if (childStyle.position === 'absolute') return;
            
            relativeChildrenCount++;
            
            // Ignore self (listRef), measureRef, and the dropdown container
            if (child === listRef.current) return;
            if (child === measureRef.current) return;
            if (child.classList.contains('tabs-dropdown-container')) return;
            
            levelUsedWidth += child.getBoundingClientRect().width;
         });
         
         const totalGaps = Math.max(0, relativeChildrenCount - 1) * gap;
         usedSpace += levelUsedWidth + totalGaps;
         
         if (parent === headerChild) break;
         currentLevel = parent as HTMLDivElement;
      }
      
      const availableForTabs = maxHeaderChildWidth - usedSpace;
      
      setShouldCollapse(requiredWidth > availableForTabs || availableForTabs < 100);
    };

    // Initial check
    handleResize();

    // Observe resize of the outer header to capture window resize or layout changes
    let resizeObserver: ResizeObserver | null = null;
    
    // Find outer header again for observer
    let current = listRef.current?.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.justifyContent === 'space-between') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(current);
        break;
      }
      current = current.parentElement;
    }
    
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [children, uiScale]);

  const triggers = React.Children.toArray(children) as React.ReactElement[];

  return (
    <>
      {/* Hidden measure element */}
      <div 
        ref={measureRef} 
        className={cn(
          "absolute opacity-0 pointer-events-none inline-flex h-10 items-center justify-center rounded-lg p-1 border border-transparent",
          className
        )}
        aria-hidden="true"
      >
        {triggers.map((child, i) => (
          <MeasureTab key={i} {...child.props} />
        ))}
      </div>

      {shouldCollapse ? (
        <>
          {/* Hidden functional list to maintain state and context */}
          <TabsPrimitive.List
            ref={listRef}
            style={{ display: 'none' }}
            {...props}
          >
            {triggers.map((trigger, i) => 
               React.cloneElement(trigger, {
                 key: i,
                 'data-tab-value': trigger.props.value,
               })
            )}
          </TabsPrimitive.List>

          {/* Visible Dropdown */}
          <div className={cn("tabs-dropdown-container inline-flex h-10 items-center justify-center rounded-lg bg-transparent p-1 text-font-2 backdrop-blur-lg border border-border shadow-sm", className)}>
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
                  const badgeColor = trigger.props.badgeColor || 'bg-red';
                  
                  return (
                    <DropdownMenuItem 
                      key={index}
                      onClick={() => {
                         if (listRef.current) {
                           const value = trigger.props.value;
                           const hiddenTrigger = listRef.current.querySelector(`[data-tab-value="${value}"]`) as HTMLElement;
                           hiddenTrigger?.click();
                         }
                      }}
                      className={cn(
                        "flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-white focus:bg-accent focus:text-white gap-2",
                        trigger.props.className
                      )}
                    >
                      {trigger.props.children}
                      {badge !== undefined && badge !== null && badge !== 0 && badge !== "0" && (
                        <span className={cn(
                          "flex items-center justify-center text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full tabular-nums shadow-sm ml-auto",
                          badgeColor
                        )}>
                          {badge}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
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
      )}
    </>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  badge?: string | number;
  badgeColor?: string;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, disabled, badge, badgeColor = 'bg-red', children, ...props }, ref) => (
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
      <span className={cn(
        "flex items-center justify-center text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full tabular-nums shadow-sm",
        badgeColor
      )}>
        {badge}
      </span>
    )}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Default export for simpler usage if needed, though named exports are preferred
const TabsComponent = ({ tabs, activeTab, onChange, className }: { 
  tabs: { id: string, label: string, badge?: string | number }[], 
  activeTab: string, 
  onChange: (id: string) => void,
  className?: string
}) => {
  return (
    <Tabs value={activeTab} onValueChange={onChange} className={className}>
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id} badge={tab.badge}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default TabsComponent;
export { Tabs, TabsList, TabsTrigger, TabsContent }
