import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TestMagnusInactive = () => {
  const handleTestMagnus = async () => {
    try {
      console.log('Calling test-magnus-inactive function...');
      
      const { data, error } = await supabase.functions.invoke('test-magnus-inactive', {
        body: {}
      });

      if (error) {
        console.error('Error calling function:', error);
        toast.error('Fehler beim Testen: ' + error.message);
        return;
      }

      console.log('Function response:', data);
      toast.success('Test erfolgreich! Check Make.com für den Webhook.');
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Testen der Function');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Magnus Inaktiv Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleTestMagnus}>
          Test Magnus Inaktiv Webhook
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Sendet einen Test-Webhook für Magnus an Make.com
        </p>
      </CardContent>
    </Card>
  );
};

export default TestMagnusInactive;