-- Create credit_transactions table to track all credit movements
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,           -- Positive = Aufladung, Negative = Abzug
  transaction_type TEXT NOT NULL,    -- 'course_registration', 'course_cancellation', 'admin_recharge', 'admin_deduction', 'open_gym'
  reference_id UUID,                 -- Verknüpfung zu course_id, etc.
  description TEXT,                  -- z.B. "Kursanmeldung: Functional Fitness 21.01.2026"
  balance_after INTEGER NOT NULL,    -- Kontostand nach der Transaktion
  created_by UUID,                   -- Admin user_id bei manuellen Änderungen
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all transactions
CREATE POLICY "Admins can manage all credit transactions" 
ON public.credit_transactions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own transactions
CREATE POLICY "Users can view own credit transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert transactions (for triggers)
CREATE POLICY "System can insert credit transactions" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (true);