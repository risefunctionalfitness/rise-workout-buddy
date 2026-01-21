import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, ArrowUp, ArrowDown, CreditCard, RefreshCw, Calendar } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface Transaction {
  id: string
  amount: number
  transaction_type: string
  description: string | null
  balance_after: number
  created_at: string
  reference_id: string | null
}

interface CreditTransactionHistoryProps {
  userId: string
  userName: string
  onBack: () => void
}

const getTransactionTypeLabel = (type: string): string => {
  switch (type) {
    case 'admin_recharge':
      return 'Aufladung'
    case 'admin_deduction':
      return 'Abzug (Admin)'
    case 'course_registration':
      return 'Kursanmeldung'
    case 'course_cancellation':
      return 'Stornierung'
    case 'open_gym':
      return 'Open Gym'
    default:
      return type
  }
}

const getTransactionIcon = (amount: number) => {
  return amount > 0 ? (
    <ArrowUp className="h-4 w-4 text-green-500" />
  ) : (
    <ArrowDown className="h-4 w-4 text-destructive" />
  )
}

export const CreditTransactionHistory = ({ userId, userName, onBack }: CreditTransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState<number>(0)

  useEffect(() => {
    loadTransactions()
    loadCurrentBalance()
  }, [userId])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_credits')
        .select('credits_remaining')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        setCurrentBalance(data.credits_remaining)
      }
    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{userName}</h2>
          <p className="text-sm text-muted-foreground">Transaktionsverlauf</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <CreditCard className="h-4 w-4 mr-2" />
          {currentBalance} Credits
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Alle Transaktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Keine Transaktionen gefunden</p>
              <p className="text-sm">Transaktionen werden ab jetzt protokolliert</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        {getTransactionIcon(transaction.amount)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.description || getTransactionTypeLabel(transaction.transaction_type)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(transaction.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</span>
                          <Badge variant="outline" className="text-xs">
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kontostand: {transaction.balance_after}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
