'use client'

import { Loader2, Plus } from 'lucide-react'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateModelInstance } from '@/hooks/queries/models'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/lib/i18n'

interface CreateModelDialogProps {
  providerName: string
  workspaceId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateModelDialog({
  providerName,
  workspaceId,
  open,
  onOpenChange,
}: CreateModelDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const createInstance = useCreateModelInstance()

  const [modelName, setModelName] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(true)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = modelName.trim()
    if (!trimmed) return

    try {
      await createInstance.mutateAsync({
        provider_name: providerName,
        model_name: trimmed,
        model_type: 'chat',
        workspaceId,
        is_default: setAsDefault,
      })
      toast({
        variant: 'success',
        description: t('settings.modelInstanceCreated', { defaultValue: '模型已添加' }),
      })
      setModelName('')
      onOpenChange(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('settings.error'),
        description: err instanceof Error ? err.message : t('settings.failedToCreateModelInstance', { defaultValue: '添加模型失败' }),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={16} />
            {t('settings.addCustomModel', { defaultValue: '添加自定义模型' })}
          </DialogTitle>
          <DialogDescription>
            {t('settings.addCustomModelHint', { defaultValue: '用于 OpenAI 兼容端点（如 DashScope）输入真实的模型名称，例如 qwen-plus。' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="model_name">{t('settings.modelName', { defaultValue: '模型名称' })}</Label>
            <Input
              id="model_name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={t('settings.enterModelName', { defaultValue: '例如：qwen-plus' })}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="set_default"
              checked={setAsDefault}
              onCheckedChange={(v) => setSetAsDefault(Boolean(v))}
            />
            <Label htmlFor="set_default" className="text-sm">
              {t('settings.setAsDefaultModel', { defaultValue: '设为默认模型' })}
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('settings.cancel')}
            </Button>
            <Button type="submit" disabled={createInstance.isPending}>
              {createInstance.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {t('settings.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

