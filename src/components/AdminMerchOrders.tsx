import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Download, Package, Euro, Calendar, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface MerchSettings {
  id: string;
  order_deadline: string | null;
  is_ordering_open: boolean;
}

interface OrderWithItems {
  id: string;
  user_id: string;
  is_paid: boolean;
  total_amount: number;
  created_at: string;
  profile: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  items: {
    product_type: string;
    size: string;
    quantity: number;
    price_per_item: number;
  }[];
}

interface AggregatedItem {
  product_type: string;
  size: string;
  count: number;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export const AdminMerchOrders = () => {
  const [settings, setSettings] = useState<MerchSettings | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [isOrderingOpen, setIsOrderingOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("merch_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settingsData) {
        setSettings(settingsData);
        setDeadlineInput(
          settingsData.order_deadline
            ? format(new Date(settingsData.order_deadline), "yyyy-MM-dd'T'HH:mm")
            : ""
        );
        setIsOrderingOpen(settingsData.is_ordering_open);
      }

      // Load orders with profiles
      const { data: ordersData, error: ordersError } = await supabase
        .from("merch_orders")
        .select(`
          id,
          user_id,
          is_paid,
          total_amount,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Load items and profiles separately
      const ordersWithDetails: OrderWithItems[] = [];

      for (const order of ordersData || []) {
        const { data: items } = await supabase
          .from("merch_order_items")
          .select("product_type, size, quantity, price_per_item")
          .eq("order_id", order.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, first_name, last_name, email")
          .eq("user_id", order.user_id)
          .maybeSingle();

        ordersWithDetails.push({
          ...order,
          profile,
          items: items || [],
        });
      }

      setOrders(ordersWithDetails);

      // Calculate aggregated data
      const aggregatedMap = new Map<string, AggregatedItem>();
      
      for (const order of ordersWithDetails) {
        for (const item of order.items) {
          const key = `${item.product_type}-${item.size}`;
          const existing = aggregatedMap.get(key);
          if (existing) {
            existing.count += item.quantity;
          } else {
            aggregatedMap.set(key, {
              product_type: item.product_type,
              size: item.size,
              count: item.quantity,
            });
          }
        }
      }

      // Sort: T-shirts first (XS-3XL), then longsleeves (XS-XXL)
      const sortedAggregated = Array.from(aggregatedMap.values()).sort((a, b) => {
        if (a.product_type !== b.product_type) {
          return a.product_type === "tshirt" ? -1 : 1;
        }
        return SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
      });

      setAggregated(sortedAggregated);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("merch_settings")
        .update({
          order_deadline: deadlineInput ? new Date(deadlineInput).toISOString() : null,
          is_ordering_open: isOrderingOpen,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Einstellungen wurden aktualisiert.",
      });

      loadData();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const togglePaid = async (orderId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("merch_orders")
        .update({ is_paid: !currentValue })
        .eq("id", orderId);

      if (error) throw error;

      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, is_paid: !currentValue } : order
        )
      );
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "E-Mail",
      "Produkt",
      "Größe",
      "Anzahl",
      "Einzelpreis",
      "Gesamtbetrag",
      "Bezahlt",
      "Bestelldatum",
    ];

    const rows: string[][] = [];

    for (const order of orders) {
      const name =
        order.profile?.display_name ||
        `${order.profile?.first_name || ""} ${order.profile?.last_name || ""}`.trim() ||
        "Unbekannt";
      const email = order.profile?.email || "";
      const orderDate = format(new Date(order.created_at), "dd.MM.yyyy HH:mm", {
        locale: de,
      });
      const isPaid = order.is_paid ? "Ja" : "Nein";

      for (const item of order.items) {
        rows.push([
          name,
          email,
          item.product_type === "tshirt" ? "T-Shirt" : "Longsleeve",
          item.size,
          item.quantity.toString(),
          `${item.price_per_item} €`,
          `${order.total_amount} €`,
          isPaid,
          orderDate,
        ]);
      }
    }

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `merch-bestellungen-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDisplayName = (order: OrderWithItems) => {
    if (order.profile?.display_name) return order.profile.display_name;
    const firstName = order.profile?.first_name || "";
    const lastName = order.profile?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Unbekannt";
  };

  const formatItems = (items: OrderWithItems["items"]) => {
    return items
      .map(
        (item) =>
          `${item.product_type === "tshirt" ? "T-Shirt" : "Longsleeve"} ${item.size} x${item.quantity}`
      )
      .join(", ");
  };

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const totalItems = aggregated.reduce((sum, item) => sum + item.count, 0);
  const paidOrders = orders.filter((o) => o.is_paid).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Bestellfrist
              </Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-4 py-2">
              <Label htmlFor="ordering-open" className="cursor-pointer">
                Bestellungen öffnen
              </Label>
              <Switch
                id="ordering-open"
                checked={isOrderingOpen}
                onCheckedChange={setIsOrderingOpen}
              />
            </div>
          </div>
          <Button onClick={saveSettings} disabled={savingSettings}>
            <Save className="h-4 w-4 mr-2" />
            {savingSettings ? "Speichern..." : "Speichern"}
          </Button>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Bestellungen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Artikel gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{totalRevenue} €</div>
            <p className="text-xs text-muted-foreground">Gesamtumsatz</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {paidOrders}/{orders.length}
            </div>
            <p className="text-xs text-muted-foreground">Bezahlt</p>
          </CardContent>
        </Card>
      </div>

      {/* Aggregated Overview */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Übersicht für Sammelbestellung
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aggregated.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Bestellungen vorhanden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Größe</TableHead>
                  <TableHead className="text-right">Anzahl</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregated.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item.product_type === "tshirt" ? "T-Shirt" : "Longsleeve"}
                    </TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell className="text-right font-medium">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Individual Orders */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Euro className="h-5 w-5" />
              Einzelbestellungen
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Bestellungen vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Artikel</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-center">Bezahlt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {getDisplayName(order)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "dd.MM.yyyy", {
                          locale: de,
                        })}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {formatItems(order.items)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {order.total_amount} €
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={order.is_paid}
                          onCheckedChange={() => togglePaid(order.id, order.is_paid)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
