"use client";

import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  Placement,
} from "@floating-ui/react";

interface AssignDropdownProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode | ((placement: Placement) => React.ReactNode);
}

/**
 * Dropdown wrapper with smart positioning using floating-ui.
 * Exposes placement via render prop for children to position content accordingly.
 */
export function AssignDropdown({
  isOpen,
  onOpenChange,
  trigger,
  children,
}: AssignDropdownProps) {
  const { refs, floatingStyles, context, placement } = useFloating({
    open: isOpen,
    onOpenChange,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: "end" }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {trigger}
      </div>
      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-[99999]"
            >
              {/* Support both static children and render prop */}
              {typeof children === "function" ? children(placement) : children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
