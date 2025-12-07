import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-lg border-2 bg-white px-4 py-2 text-base",
                    "transition-all duration-200",
                    "placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:bg-slate-900 dark:text-white",
                    error
                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                        : "border-slate-200 dark:border-slate-700",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
