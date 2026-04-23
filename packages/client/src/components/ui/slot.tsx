/**
 * Slot component for polymorphic rendering (asChild pattern).
 * Extracted from @radix-ui/react-slot (MIT license).
 */
import * as React from "react"
import { Fragment, jsx } from "react/jsx-runtime"

// --- composeRefs (from @radix-ui/react-compose-refs) ---

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    return ref(value)
  } else if (ref !== null && ref !== undefined) {
    ;(ref as React.MutableRefObject<T>).current = value
  }
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    let hasCleanup = false
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node)
      if (!hasCleanup && typeof cleanup === "function") {
        hasCleanup = true
      }
      return cleanup
    })
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i]
          if (typeof cleanup === "function") {
            ;(cleanup as () => void)()
          } else {
            setRef(refs[i], null as unknown as T)
          }
        }
      }
    }
  }
}

// --- Slot ---

const SLOTTABLE_IDENTIFIER = Symbol("slottable")

interface SlottableProps {
  children: React.ReactNode
}

function Slottable({ children }: SlottableProps) {
  return jsx(Fragment, { children })
}
;(Slottable as unknown as { __slotId: symbol }).__slotId = SLOTTABLE_IDENTIFIER

function isSlottable(
  child: React.ReactNode,
): child is React.ReactElement<SlottableProps> {
  return (
    React.isValidElement(child) &&
    typeof child.type === "function" &&
    "__slotId" in child.type &&
    (child.type as unknown as { __slotId: symbol }).__slotId ===
      SLOTTABLE_IDENTIFIER
  )
}

function getElementRef(element: React.ReactElement) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get
  let mayWarn = getter && "isReactWarning" in getter && (getter as { isReactWarning?: boolean }).isReactWarning
  if (mayWarn) {
    return (element as unknown as { ref: React.Ref<unknown> }).ref
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get
  mayWarn = getter && "isReactWarning" in getter && (getter as { isReactWarning?: boolean }).isReactWarning
  if (mayWarn) {
    return element.props.ref
  }
  return element.props.ref || (element as unknown as { ref: React.Ref<unknown> }).ref
}

function mergeProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>,
) {
  const overrideProps = { ...childProps }
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]
    const isHandler = /^on[A-Z]/.test(propName)
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          const result = (childPropValue as Function)(...args)
          ;(slotPropValue as Function)(...args)
          return result
        }
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue
      }
    } else if (propName === "style") {
      overrideProps[propName] = {
        ...(slotPropValue as object),
        ...(childPropValue as object),
      }
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue]
        .filter(Boolean)
        .join(" ")
    }
  }
  return { ...slotProps, ...overrideProps }
}

interface SlotProps {
  children?: React.ReactNode
  [key: string]: unknown
}

const SlotClone = React.forwardRef<HTMLElement, SlotProps>(
  (props, forwardedRef) => {
  const { children, ...slotProps } = props
  if (React.isValidElement(children)) {
    const childrenRef = getElementRef(children)
    const mergedProps = mergeProps(slotProps, children.props as Record<string, unknown>)
    if (children.type !== React.Fragment) {
      mergedProps.ref = forwardedRef
        ? composeRefs(forwardedRef, childrenRef)
        : childrenRef
    }
    return React.cloneElement(children, mergedProps)
  }
  return React.Children.count(children) > 1 ? React.Children.only(null) : null
  },
)
SlotClone.displayName = "SlotClone"

const Slot = React.forwardRef<HTMLElement, SlotProps>(
  (props, forwardedRef) => {
  const { children, ...slotProps } = props
  const childrenArray = React.Children.toArray(children as React.ReactNode) as React.ReactNode[]
  const slottable = childrenArray.find(isSlottable)
  if (slottable) {
    const newElement = slottable.props.children as React.ReactNode
    const newChildren = childrenArray.map((child) => {
      if (child === slottable) {
        if (React.Children.count(newElement) > 1)
          return React.Children.only(null)
        return React.isValidElement(newElement)
          ? (newElement.props as { children?: React.ReactNode }).children
          : null
      }
      return child
    }) as React.ReactNode[]
    return (
      <SlotClone {...slotProps} ref={forwardedRef}>
        {React.isValidElement(newElement)
          ? React.cloneElement(newElement, undefined, ...newChildren)
          : null}
      </SlotClone>
    )
  }
  return (
    <SlotClone {...slotProps} ref={forwardedRef}>
      {children}
    </SlotClone>
  )
  },
)
Slot.displayName = "Slot"

export { Slot, Slottable }
