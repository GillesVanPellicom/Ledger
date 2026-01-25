import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { useSettingsStore } from "../../store/useSettingsStore"
import { cn } from "../../utils/cn"
import Spinner from "./Spinner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { settings } = useSettingsStore()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      duration={settings.notifications?.duration || 4000}
      position={settings.notifications?.position || 'top-center'}
      icons={{
        loading: <Spinner className="h-4 w-4" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-bg-modal group-[.toaster]:text-font-1 group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:border overflow-visible",
          description: "group-[.toast]:text-font-2",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-field group-[.toast]:text-font-2",
          error: "group-[.toaster]:text-red group-[.toaster]:border-red/20 group-[.toaster]:bg-red/5",
          success: "group-[.toaster]:text-green group-[.toaster]:!bg-bg-modal group-[.toaster]:!border-border",
          warning: "group-[.toaster]:text-yellow group-[.toaster]:!bg-bg-modal group-[.toaster]:!border-border",
          info: "group-[.toaster]:text-blue group-[.toaster]:!bg-bg-modal group-[.toaster]:!border-border",
          closeButton: "!bg-field !text-font-2 !border !border-border !hover:bg-field-hover !left-auto !right-[-6px] !top-[-6px] !transform-none",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
