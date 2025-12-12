import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ShoppingCart, Info, ZoomIn, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import merchImage from "@/assets/rise-merch.jpg";

interface MerchOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onOrderComplete: () => void;
}

interface OrderItem {
  id: string;
  product_type: "tshirt" | "longsleeve";
  size: string;
  quantity: number;
}

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const LONGSLEEVE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const TSHIRT_PRICE = 30;
const LONGSLEEVE_PRICE = 40;

export const MerchOrderDialog = ({
  open,
  onOpenChange,
  userId,
  onOrderComplete,
}: MerchOrderDialogProps) => {
  const [tshirtItems, setTshirtItems] = useState<OrderItem[]>([]);
  const [longsleeveItems, setLongsleeveItems] = useState<OrderItem[]>([]);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadExistingOrder();
    }
  }, [open, userId]);

  const loadExistingOrder = async () => {
    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("merch_orders")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (orderError) throw orderError;

      if (order) {
        setExistingOrderId(order.id);

        const { data: items, error: itemsError } = await supabase
          .from("merch_order_items")
          .select("*")
          .eq("order_id", order.id);

        if (itemsError) throw itemsError;

        const tshirts = items
          ?.filter((i) => i.product_type === "tshirt")
          .map((i) => ({
            id: i.id,
            product_type: i.product_type as "tshirt",
            size: i.size,
            quantity: i.quantity,
          })) || [];

        const longsleeves = items
          ?.filter((i) => i.product_type === "longsleeve")
          .map((i) => ({
            id: i.id,
            product_type: i.product_type as "longsleeve",
            size: i.size,
            quantity: i.quantity,
          })) || [];

        setTshirtItems(tshirts.length > 0 ? tshirts : []);
        setLongsleeveItems(longsleeves.length > 0 ? longsleeves : []);
      } else {
        setExistingOrderId(null);
        setTshirtItems([]);
        setLongsleeveItems([]);
      }
    } catch (error) {
      console.error("Error loading existing order:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => crypto.randomUUID();

  const addTshirtItem = () => {
    setTshirtItems([
      ...tshirtItems,
      { id: generateId(), product_type: "tshirt", size: "M", quantity: 1 },
    ]);
  };

  const addLongsleeveItem = () => {
    setLongsleeveItems([
      ...longsleeveItems,
      { id: generateId(), product_type: "longsleeve", size: "M", quantity: 1 },
    ]);
  };

  const updateItem = (
    items: OrderItem[],
    setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>,
    id: string,
    field: "size" | "quantity",
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (
    items: OrderItem[],
    setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>,
    id: string
  ) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    const tshirtTotal = tshirtItems.reduce(
      (sum, item) => sum + item.quantity * TSHIRT_PRICE,
      0
    );
    const longsleeveTotal = longsleeveItems.reduce(
      (sum, item) => sum + item.quantity * LONGSLEEVE_PRICE,
      0
    );
    return tshirtTotal + longsleeveTotal;
  };

  const hasItems = tshirtItems.length > 0 || longsleeveItems.length > 0;

  const handleSubmit = async () => {
    if (!hasItems) {
      toast({
        title: "Warenkorb leer",
        description: "Bitte füge mindestens ein Produkt hinzu.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const totalAmount = calculateTotal();

      if (existingOrderId) {
        await supabase
          .from("merch_order_items")
          .delete()
          .eq("order_id", existingOrderId);

        await supabase
          .from("merch_orders")
          .update({ total_amount: totalAmount, updated_at: new Date().toISOString() })
          .eq("id", existingOrderId);

        const allItems = [...tshirtItems, ...longsleeveItems].map((item) => ({
          order_id: existingOrderId,
          product_type: item.product_type,
          size: item.size,
          quantity: item.quantity,
          price_per_item: item.product_type === "tshirt" ? TSHIRT_PRICE : LONGSLEEVE_PRICE,
        }));

        const { error: itemsError } = await supabase
          .from("merch_order_items")
          .insert(allItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Bestellung aktualisiert",
          description: "Deine Bestellung wurde erfolgreich aktualisiert.",
        });
      } else {
        const { data: newOrder, error: orderError } = await supabase
          .from("merch_orders")
          .insert({
            user_id: userId,
            total_amount: totalAmount,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const allItems = [...tshirtItems, ...longsleeveItems].map((item) => ({
          order_id: newOrder.id,
          product_type: item.product_type,
          size: item.size,
          quantity: item.quantity,
          price_per_item: item.product_type === "tshirt" ? TSHIRT_PRICE : LONGSLEEVE_PRICE,
        }));

        const { error: itemsError } = await supabase
          .from("merch_order_items")
          .insert(allItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Bestellung abgeschickt",
          description: "Deine Bestellung wurde erfolgreich aufgegeben!",
        });
      }

      onOrderComplete();
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Fehler",
        description: "Die Bestellung konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!existingOrderId) return;

    if (!confirm("Möchtest du deine Bestellung wirklich löschen?")) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("merch_orders")
        .delete()
        .eq("id", existingOrderId);

      if (error) throw error;

      toast({
        title: "Bestellung gelöscht",
        description: "Deine Bestellung wurde gelöscht.",
      });

      setExistingOrderId(null);
      setTshirtItems([]);
      setLongsleeveItems([]);
      onOrderComplete();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Fehler",
        description: "Die Bestellung konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderItemRow = (
    item: OrderItem,
    sizes: string[],
    items: OrderItem[],
    setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>
  ) => (
    <div key={item.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1">
          <span className="text-xs text-muted-foreground block mb-1">Größe</span>
          <Select
            value={item.size}
            onValueChange={(value) => updateItem(items, setItems, item.id, "size", value)}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-20">
          <span className="text-xs text-muted-foreground block mb-1">Anzahl</span>
          <Input
            type="number"
            min={1}
            max={10}
            value={item.quantity === 0 ? "" : item.quantity}
            onChange={(e) => {
              const val = e.target.value === "" ? 0 : parseInt(e.target.value);
              updateItem(items, setItems, item.id, "quantity", val);
            }}
            onBlur={(e) => {
              if (e.target.value === "" || parseInt(e.target.value) < 1) {
                updateItem(items, setItems, item.id, "quantity", 1);
              }
            }}
            className="h-10 text-center bg-background"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeItem(items, setItems, item.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-5"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">T-Shirt Bestellung</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Image with Zoom */}
              <div 
                className="relative rounded-xl overflow-hidden border-2 border-muted cursor-pointer group"
                onClick={() => setImageZoomOpen(true)}
              >
                <img
                  src={merchImage}
                  alt="RISE Merch"
                  className="w-full h-auto object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white px-4 py-2 rounded-full flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    <span className="text-sm font-medium">Vergrößern</span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Im Gym liegen Test-Shirts zum Anprobieren für die Größe.
                </p>
              </div>

              {/* T-Shirt Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
                  <div>
                    <h3 className="font-bold text-lg">T-Shirt</h3>
                    <p className="text-primary font-semibold">{TSHIRT_PRICE} €</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addTshirtItem}
                    className="h-10 w-10 rounded-full border-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                {tshirtItems.length > 0 && (
                  <div className="space-y-2 pl-2">
                    {tshirtItems.map((item) =>
                      renderItemRow(item, TSHIRT_SIZES, tshirtItems, setTshirtItems)
                    )}
                  </div>
                )}
              </div>

              {/* Longsleeve Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
                  <div>
                    <h3 className="font-bold text-lg">Longsleeve</h3>
                    <p className="text-primary font-semibold">{LONGSLEEVE_PRICE} €</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addLongsleeveItem}
                    className="h-10 w-10 rounded-full border-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                {longsleeveItems.length > 0 && (
                  <div className="space-y-2 pl-2">
                    {longsleeveItems.map((item) =>
                      renderItemRow(item, LONGSLEEVE_SIZES, longsleeveItems, setLongsleeveItems)
                    )}
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              {hasItems && (
                <div className="border-t-2 border-muted pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Warenkorb
                  </div>
                  <div className="space-y-1 text-sm bg-muted/30 rounded-lg p-3">
                    {tshirtItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>T-Shirt {item.size} × {item.quantity}</span>
                        <span className="font-medium">{item.quantity * TSHIRT_PRICE} €</span>
                      </div>
                    ))}
                    {longsleeveItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>Longsleeve {item.size} × {item.quantity}</span>
                        <span className="font-medium">{item.quantity * LONGSLEEVE_PRICE} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-xl pt-2">
                    <span>Gesamt</span>
                    <span className="text-primary">{calculateTotal()} €</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!hasItems || submitting}
                  className="w-full h-14 text-lg"
                >
                  {submitting
                    ? "Wird gespeichert..."
                    : existingOrderId
                    ? "Bestellung aktualisieren"
                    : "Bestellung abschicken"}
                </Button>
                {existingOrderId && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteOrder}
                    disabled={submitting}
                    className="w-full h-12 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    Bestellung löschen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={imageZoomOpen} onOpenChange={setImageZoomOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setImageZoomOpen(false)}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <img
              src={merchImage}
              alt="RISE Merch - Vergrößert"
              className="max-w-none w-auto h-auto object-contain cursor-zoom-in"
              style={{ maxHeight: '90vh', maxWidth: '90vw' }}
              onClick={(e) => {
                const img = e.currentTarget;
                if (img.style.transform === 'scale(2)') {
                  img.style.transform = 'scale(1)';
                  img.style.cursor = 'zoom-in';
                } else {
                  img.style.transform = 'scale(2)';
                  img.style.cursor = 'zoom-out';
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};