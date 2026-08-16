import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { SelectedThemeType, UserTheme } from '@/lib/app-settings'
import { CUSTOM_THEME_PRESETS } from '@/lib/custom-theme'
import { cn } from '@/lib/utils'

import { StackedField } from './settings-dialog-ui'
import { ThemeUiPreview } from './theme-ui-preview'

function ThemeOptionCard({
  value,
  name,
  description,
  lightCss,
  darkCss,
  selected,
  onEdit,
  onDelete,
}: {
  value: string
  name: string
  description?: string
  lightCss: string
  darkCss: string
  selected: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const id = useId()

  return (
    <div className="group relative">
      <RadioGroupItem id={id} value={value} className="absolute top-3 right-3 z-10 hidden" />
      <Label
        htmlFor={id}
        className={cn(
          'flex h-full min-h-32 cursor-pointer flex-col items-stretch gap-2 rounded-lg border bg-background p-2 pe-8 text-left transition-[box-shadow,background-color,border-color] hover:bg-muted/40',
          selected && 'border-primary bg-muted/30 ring-2 ring-primary/25',
        )}
      >
        <ThemeUiPreview lightCss={lightCss} darkCss={darkCss} />
        <span className="min-w-0 px-0.5 pe-14">
          <span className="block truncate text-sm font-medium">{name}</span>
          {description ? (
            <span className="text-muted-foreground block truncate text-xs font-normal">
              {description}
            </span>
          ) : null}
        </span>
      </Label>

      {onEdit || onDelete ? (
        <div className="absolute right-2 bottom-2 flex gap-0.5">
          {onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`编辑 ${name}`}
              onClick={onEdit}
            >
              <Pencil aria-hidden="true" />
            </Button>
          ) : null}
          {onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`删除 ${name}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除“{name}”？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作无法撤销。如果它正在使用，xb 会自动切换到默认主题。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={onDelete}>
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

interface SettingsThemePickerProps {
  scrollContainerRef?: React.RefObject<HTMLElement | null>
  selectedThemeType: SelectedThemeType
  selectedThemeId: string
  userThemes: UserTheme[]
  onSelectPreset: (presetKey: string) => void
  onSelectUserTheme: (themeId: string) => void
  onAddCustomTheme: () => string
  onDeleteUserTheme: (themeId: string) => void
  onUpdateUserTheme: (
    themeId: string,
    patch: Partial<Pick<UserTheme, 'name' | 'lightCss' | 'darkCss'>>,
  ) => void
}

export function SettingsThemePicker({
  scrollContainerRef,
  selectedThemeType,
  selectedThemeId,
  userThemes,
  onSelectPreset,
  onSelectUserTheme,
  onAddCustomTheme,
  onDeleteUserTheme,
  onUpdateUserTheme,
}: SettingsThemePickerProps) {
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [themeNameInput, setThemeNameInput] = useState('')
  const [editLightCss, setEditLightCss] = useState('')
  const [editDarkCss, setEditDarkCss] = useState('')
  const editTopRef = useRef<HTMLDivElement>(null)

  const editingTheme =
    editingThemeId === null ? null : userThemes.find((theme) => theme.id === editingThemeId)
  useEffect(() => {
    if (view === 'edit' && editingTheme) {
      setThemeNameInput(editingTheme.name)
      setEditLightCss(editingTheme.lightCss)
      setEditDarkCss(editingTheme.darkCss)
    }
  }, [view, editingTheme])

  useEffect(() => {
    if (view !== 'edit') return

    scrollContainerRef?.current?.scrollTo?.({ top: 0, behavior: 'instant' })
    editTopRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
  }, [view, editingThemeId, scrollContainerRef])

  function openEditView(themeId: string) {
    const theme = userThemes.find((item) => item.id === themeId)
    if (!theme) return

    setEditingThemeId(themeId)
    setThemeNameInput(theme.name)
    setEditLightCss(theme.lightCss)
    setEditDarkCss(theme.darkCss)
    setView('edit')
  }

  function handleEditLightCssChange(value: string) {
    if (!editingThemeId) return

    setEditLightCss(value)
    onUpdateUserTheme(editingThemeId, { lightCss: value })
  }

  function handleEditDarkCssChange(value: string) {
    if (!editingThemeId) return

    setEditDarkCss(value)
    onUpdateUserTheme(editingThemeId, { darkCss: value })
  }

  function handleAddTheme() {
    const id = onAddCustomTheme()
    setEditingThemeId(id)
    setView('edit')
  }

  function handleSaveThemeName() {
    const name = themeNameInput.trim()
    if (editingThemeId && name.length > 0) onUpdateUserTheme(editingThemeId, { name })
  }

  if (view === 'edit' && editingTheme) {
    return (
      <div ref={editTopRef} className="flex flex-col gap-5 px-6 py-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ms-2 w-fit"
          onClick={() => {
            setView('list')
            setEditingThemeId(null)
          }}
        >
          <ArrowLeft aria-hidden="true" />
          返回主题列表
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="custom-theme-name">主题名称</Label>
            <Input
              id="custom-theme-name"
              value={themeNameInput}
              onChange={(event) => setThemeNameInput(event.target.value)}
              onBlur={handleSaveThemeName}
            />
          </div>
          <Button
            size="sm"
            disabled={
              themeNameInput.trim().length === 0 || themeNameInput.trim() === editingTheme.name
            }
            onClick={handleSaveThemeName}
          >
            保存名称
          </Button>
        </div>

        <StackedField
          label="浅色主题样式变量"
          description="每行输入一个 CSS 变量声明，例如 --foreground: #333333;"
        >
          <Textarea
            aria-label="浅色主题样式变量"
            value={editLightCss}
            onChange={(event) => handleEditLightCssChange(event.target.value)}
            rows={10}
            spellCheck={false}
            className="min-h-44 resize-y font-mono text-xs leading-relaxed"
            placeholder="--background: oklch(1 0 0);&#10;--foreground: #333333;"
          />
        </StackedField>

        <StackedField
          label="深色主题样式变量"
          description="编辑中的主题正在使用时，修改会立即应用。"
        >
          <Textarea
            aria-label="深色主题样式变量"
            value={editDarkCss}
            onChange={(event) => handleEditDarkCssChange(event.target.value)}
            rows={10}
            spellCheck={false}
            className="min-h-44 resize-y font-mono text-xs leading-relaxed"
            placeholder="--background: oklch(0.145 0 0);&#10;--foreground: #ffffff;"
          />
        </StackedField>
      </div>
    )
  }

  const selectedValue = `${selectedThemeType}:${selectedThemeId}`

  return (
    <RadioGroup
      aria-label="主题选择"
      value={selectedValue}
      onValueChange={(value) => {
        if (typeof value !== 'string') return
        const separator = value.indexOf(':')
        const type = value.slice(0, separator)
        const id = value.slice(separator + 1)
        if (type === 'preset') onSelectPreset(id)
        if (type === 'custom') onSelectUserTheme(id)
      }}
      className="flex flex-col gap-5 px-6 py-5"
    >
      <section className="flex flex-col gap-3" aria-labelledby="preset-theme-heading">
        <h3 id="preset-theme-heading" className="text-sm font-semibold">
          内置主题
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CUSTOM_THEME_PRESETS.map((preset) => (
            <ThemeOptionCard
              key={preset.key}
              value={`preset:${preset.key}`}
              name={preset.name}
              description={preset.description}
              lightCss={preset.lightCss}
              darkCss={preset.darkCss}
              selected={selectedValue === `preset:${preset.key}`}
            />
          ))}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3" aria-labelledby="custom-theme-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="custom-theme-heading" className="text-sm font-semibold">
              自定义主题
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              创建并维护你自己的浅色和深色配色。
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleAddTheme}>
            <Plus aria-hidden="true" />
            新建主题
          </Button>
        </div>

        {userThemes.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-xs">
            还没有自定义主题
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {userThemes.map((theme) => (
              <ThemeOptionCard
                key={theme.id}
                value={`custom:${theme.id}`}
                name={theme.name}
                lightCss={theme.lightCss}
                darkCss={theme.darkCss}
                selected={selectedValue === `custom:${theme.id}`}
                onEdit={() => openEditView(theme.id)}
                onDelete={() => {
                  onDeleteUserTheme(theme.id)
                  if (editingThemeId === theme.id) {
                    setView('list')
                    setEditingThemeId(null)
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </RadioGroup>
  )
}
