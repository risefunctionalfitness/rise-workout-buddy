import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (templateName: string) => Promise<void>;
}

export const SaveTemplateDialog = ({ open, onOpenChange, onSave }: SaveTemplateDialogProps) => {
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) return;
    
    setSaving(true);
    try {
      await onSave(templateName);
      setTemplateName('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vorlage speichern</DialogTitle>
          <DialogDescription>
            Gib der Vorlage einen Namen, um sie später wiederzuverwenden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Vorlagenname</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="z.B. Reaktivierung inaktive Mitglieder"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!templateName.trim() || saving}>
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
