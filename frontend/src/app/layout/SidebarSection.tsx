import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react"
export function SidebarSection({
  pages,
  activePage,
  onNavigate,
  badgeCounts,
  collapsed,
}: {
  pages: string[]
  activePage: string
  onNavigate: (page: string) => void
  badgeCounts: Record<string, number>
  collapsed: boolean
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Inventory: true,
    Contacts: true,
  })
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [submenuTop, setSubmenuTop] = useState(0)
  const submenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keepSubmenuOpen = () => {
    if (submenuCloseTimer.current) {
      clearTimeout(submenuCloseTimer.current)
      submenuCloseTimer.current = null
    }
  }
  const scheduleSubmenuClose = () => {
    keepSubmenuOpen()
    submenuCloseTimer.current = setTimeout(() => {
      setHoveredSection(null)
    }, 200)
  }
  useEffect(
    () => () => {
      if (submenuCloseTimer.current) {
        clearTimeout(submenuCloseTimer.current)
      }
    },
    []
  )
  const pageIcons: Record<string, ComponentType<{ className?: string }>> = {
    Dashboard: LayoutDashboard,
    Inventory: Boxes,
    Reservations: CalendarCheck,
    Requests: Inbox,
    "My Requests": Inbox,
    Collaborators: Users,
    Suppliers: Truck,
    Purchase: ShoppingCart,
    Analytics: BarChart3,
    Settings,
  }
  const sections = [
    {
      title: "",
      icon: LayoutDashboard,
      pages: ["Dashboard"],
      collapsible: false,
    },
    {
      title: "Inventory",
      icon: Package,
      pages: ["Inventory", "Reservations", "Requests", "My Requests"],
      collapsible: true,
    },
    {
      title: "Contacts",
      icon: Users,
      pages: ["Collaborators", "Suppliers"],
      collapsible: true,
    },
    {
      title: "",
      icon: ShoppingCart,
      pages: ["Purchase"],
      collapsible: false,
    },
    { title: "", icon: BarChart3, pages: ["Analytics"], collapsible: false },
    { title: "", icon: Settings, pages: ["Settings"], collapsible: false },
  ]

  if (collapsed) {
    return (
      <nav className="space-y-2">
        {sections.map((section, index) => {
          const visiblePages = section.pages.filter((page) => pages.includes(page))
          if (visiblePages.length === 0) {
            return null
          }

          const isGrouped = Boolean(section.title && visiblePages.length > 1)
          const page = visiblePages[0]
          const SectionIcon = isGrouped
            ? section.icon
            : pageIcons[page] || section.icon
          const hasActiveChild = visiblePages.includes(activePage)
          const key = section.title || page

          return (
            <div
              key={`${key}-${index}`}
              onMouseEnter={(event) => {
                if (!isGrouped) {
                  return
                }
                keepSubmenuOpen()
                setSubmenuTop(event.currentTarget.getBoundingClientRect().top)
                setHoveredSection(key)
              }}
              onMouseLeave={scheduleSubmenuClose}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isGrouped) {
                    onNavigate(page)
                  }
                }}
                title={isGrouped ? undefined : page}
                aria-label={isGrouped ? section.title : page}
                className={`relative flex h-11 w-full items-center justify-center rounded transition ${hasActiveChild
                    ? "bg-yellow-400 text-black"
                    : "text-gray-300 hover:bg-gray-800 hover:text-yellow-400"
                  }`}
              >
                <SectionIcon className="h-5 w-5" />
                <SidebarBadge
                  count={
                    isGrouped
                      ? visiblePages.reduce(
                        (total, childPage) =>
                          total + (badgeCounts[childPage] || 0),
                        0
                      )
                      : badgeCounts[page] || 0
                  }
                  collapsed
                />
              </button>

              {isGrouped && hoveredSection === key && (
                <div
                  onMouseEnter={keepSubmenuOpen}
                  onMouseLeave={scheduleSubmenuClose}
                  className="fixed left-[4.75rem] z-[70] w-56 rounded-lg border border-gray-200 bg-white p-2 text-gray-900 shadow-2xl before:absolute before:-left-3 before:top-0 before:h-full before:w-3 before:content-['']"
                  style={{ top: submenuTop }}
                >
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {section.title}
                  </p>
                  {visiblePages.map((childPage) => {
                    const PageIcon = pageIcons[childPage] || SectionIcon

                    return (
                      <button
                        key={childPage}
                        type="button"
                        onClick={() => {
                          onNavigate(childPage)
                          setHoveredSection(null)
                        }}
                        className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition ${activePage === childPage
                            ? "bg-yellow-400 font-semibold text-black"
                            : "hover:bg-gray-100"
                          }`}
                      >
                        <PageIcon className="h-4 w-4 shrink-0" />
                        <span>{childPage}</span>
                        <SidebarBadge count={badgeCounts[childPage] || 0} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="space-y-3">
      {sections.map((section, index) => {
        const visiblePages = section.pages.filter((page) => pages.includes(page))
        const hasActiveChild = visiblePages.includes(activePage)
        const isOpen =
          !section.collapsible ||
          openSections[section.title] ||
          hasActiveChild

        if (visiblePages.length === 0) {
          return null
        }

        if (!section.title) {
          return visiblePages.map((page) => (
            (() => {
              const PageIcon = pageIcons[page] || section.icon

              return (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={`flex w-full items-center gap-3 rounded px-3 py-3 text-left transition ${activePage === page
                    ? "bg-yellow-400 font-semibold text-black"
                    : "hover:bg-gray-800 hover:text-yellow-400"
                    }`}
                >
                  <PageIcon className="h-5 w-5 shrink-0" />
                  <span>{page}</span>
                  <SidebarBadge count={badgeCounts[page] || 0} />
                </button>
              )
            })()
          ))
        }

        const SectionIcon = section.icon

        return (
          <div key={`${section.title}-${index}`}>
            <button
              onClick={() =>
                setOpenSections({
                  ...openSections,
                  [section.title]: !openSections[section.title],
                })
              }
              className={`flex w-full items-center justify-between rounded px-3 py-3 text-left transition ${hasActiveChild
                ? "text-yellow-400"
                : "hover:bg-gray-800 hover:text-yellow-400"
                }`}
            >
              <span className="flex items-center gap-3 font-semibold">
                <SectionIcon className="h-5 w-5 shrink-0" />
                <span>{section.title}</span>
                <SidebarBadge count={badgeCounts[section.title] || 0} />
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="mt-1 space-y-1 pl-6">
                {visiblePages.map((page) => (
                  (() => {
                    const PageIcon = pageIcons[page] || SectionIcon

                    return (
                      <button
                        key={page}
                        onClick={() => onNavigate(page)}
                        className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition ${activePage === page
                          ? "bg-yellow-400 font-semibold text-black"
                          : "text-gray-300 hover:bg-gray-800 hover:text-yellow-400"
                          }`}
                      >
                        <PageIcon className="h-5 w-5 shrink-0" />
                        <span>{page}</span>
                        <SidebarBadge count={badgeCounts[page] || 0} />
                      </button>
                    )
                  })()
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBadge({
  count,
  collapsed = false,
}: {
  count: number
  collapsed?: boolean
}) {
  if (count <= 0) {
    return null
  }

  return (
    <span
      className={
        collapsed
          ? "absolute right-0.5 top-0.5 min-w-4 rounded-full bg-yellow-400 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-black"
          : "ml-auto min-w-5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-center text-xs font-bold text-black"
      }
    >
      {count}
    </span>
  )
}

