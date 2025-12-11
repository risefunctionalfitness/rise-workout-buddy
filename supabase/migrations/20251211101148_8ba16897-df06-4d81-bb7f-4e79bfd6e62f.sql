-- Create merch_settings table for order deadline configuration
CREATE TABLE public.merch_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_deadline timestamp with time zone,
  is_ordering_open boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create merch_orders table
CREATE TABLE public.merch_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create merch_order_items table
CREATE TABLE public.merch_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.merch_orders(id) ON DELETE CASCADE,
  product_type text NOT NULL CHECK (product_type IN ('tshirt', 'longsleeve')),
  size text NOT NULL CHECK (size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_per_item numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merch_settings
CREATE POLICY "Anyone authenticated can read merch settings"
ON public.merch_settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage merch settings"
ON public.merch_settings FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for merch_orders
CREATE POLICY "Users can view their own orders"
ON public.merch_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.merch_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.merch_orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
ON public.merch_orders FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.merch_orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all orders"
ON public.merch_orders FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for merch_order_items
CREATE POLICY "Users can view their own order items"
ON public.merch_order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.merch_orders
  WHERE merch_orders.id = merch_order_items.order_id
  AND merch_orders.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own order items"
ON public.merch_order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.merch_orders
  WHERE merch_orders.id = merch_order_items.order_id
  AND merch_orders.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.merch_orders
  WHERE merch_orders.id = merch_order_items.order_id
  AND merch_orders.user_id = auth.uid()
));

CREATE POLICY "Admins can view all order items"
ON public.merch_order_items FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all order items"
ON public.merch_order_items FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on merch_settings
CREATE TRIGGER update_merch_settings_updated_at
BEFORE UPDATE ON public.merch_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on merch_orders
CREATE TRIGGER update_merch_orders_updated_at
BEFORE UPDATE ON public.merch_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.merch_settings (is_ordering_open) VALUES (false);