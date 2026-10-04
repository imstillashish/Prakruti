"use client"

import * as React from "react"
import { ShaderSwitch, type ShaderSwitchProps } from "@/components/ui/ShaderSwitch"

export interface SwitchProps extends ShaderSwitchProps {}

const Switch = React.forwardRef<
  React.ElementRef<typeof ShaderSwitch>,
  SwitchProps
>(({ variant = "neutral", ...props }, ref) => (
  <ShaderSwitch ref={ref} variant={variant} {...props} />
))

Switch.displayName = "Switch"

export { Switch }
