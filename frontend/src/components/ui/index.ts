/**
 * The UI primitive library.
 *
 * Everything a screen needs to look like Cyclowareness comes from here. If a
 * feature reaches past this barrel for a Radix package directly, the styling
 * contract has a hole in it — add the primitive instead.
 */

export { Button, IconButton } from './Button'
export type { ButtonProps, ButtonSize, ButtonVariant, IconButtonProps } from './Button'

export { Panel } from './Panel'
export type { PanelProps, PanelTone } from './Panel'

export { Card } from './Card'
export type { CardProps } from './Card'

export { Badge, StatusDot } from './Badge'
export type { BadgeProps, StatusDotProps } from './Badge'
export { statusMeaning, statusTone, TONE_DOT, TONE_PILL, TONE_TEXT } from './status'
export type { StatusTone } from './status'

export { Field } from './Field'
export { CONTROL_CLASSES, controlBorder } from './field-styles'
export type { FieldAria, FieldProps } from './Field'

export { Input } from './Input'
export type { InputProps } from './Input'

export { Textarea } from './Textarea'
export type { TextareaProps } from './Textarea'

export { Select } from './Select'
export type { SelectOption, SelectProps } from './Select'

export { Checkbox } from './Checkbox'
export type { CheckboxProps } from './Checkbox'

export { Switch } from './Switch'
export type { SwitchProps } from './Switch'

export { RadioGroup } from './RadioGroup'
export type { RadioGroupProps, RadioOption } from './RadioGroup'

export { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'
export type { TabsProps } from './Tabs'

export { Tooltip, TooltipProvider } from './Tooltip'
export type { TooltipProps } from './Tooltip'

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger } from './Popover'

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu'
export type { DropdownMenuItemProps } from './DropdownMenu'

export { Dialog, DialogClose, DialogTrigger } from './Dialog'
export type { DialogProps, DialogSize } from './Dialog'

export { Drawer } from './Drawer'
export type { DrawerProps, DrawerSide, DrawerSize } from './Drawer'

export { Accordion, AccordionItem } from './Accordion'
export type { AccordionItemProps, AccordionProps } from './Accordion'

export { ScrollArea } from './ScrollArea'
export type { ScrollAreaProps } from './ScrollArea'

export { Separator } from './Separator'
export type { SeparatorProps } from './Separator'

export { Progress } from './Progress'
export type { ProgressProps } from './Progress'

export { Avatar } from './Avatar'
export type { AvatarProps, AvatarSize } from './Avatar'

export { Slider } from './Slider'
export type { SliderProps } from './Slider'

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table'
export type { TableCellProps, TableHeadProps, TableProps, TableRowProps } from './Table'

export { CodeBlock } from './CodeBlock'
export type { CodeBlockProps } from './CodeBlock'

export { CopyButton } from './CopyButton'
export type { CopyButtonProps } from './CopyButton'

export { Kbd } from './Kbd'
export type { KbdProps } from './Kbd'

export { Spinner } from './Spinner'
export type { SpinnerProps } from './Spinner'

export { Slot } from './Slot'
export type { SlotProps } from './Slot'

export { ToastProvider } from './Toast'
export { useToast } from './toast-store'
export type { ToastApi, ToastOptions, ToastRecord, ToastTone } from './toast-store'
