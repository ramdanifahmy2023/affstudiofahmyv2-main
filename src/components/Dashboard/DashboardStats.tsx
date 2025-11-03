// src/components/Dashboard/DashboardStats.tsx

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Target,
  Calendar,
  AlertCircle
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface DashboardMetrics {
  grossCommission: number;
  netCommission: number;
  paidCommission: number;
  totalExpenses: number;
  totalEmployees: number;
  totalGroups: number;
  activeAccounts: number;
  monthlyGrowth: number;
  lastUpdated: string;
}

interface TrendData {
  current: number;
  previous: number;
  percentage: number;
}

const DashboardStats = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<Record<string, TrendData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      // Fetch commission data
      const { data: commissions } = await supabase
        .from('commissions')
        .select('gross_commission, net_commission, paid_commission, created_at')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('cashflow')
        .select('amount, created_at')
        .eq('type', 'expense')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      // Fetch employees count
      const { count: employeesCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      // Fetch groups count
      const { count: groupsCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true });

      // Fetch active accounts
      const { count: activeAccountsCount } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'active');

      // Calculate totals
      const grossTotal = commissions?.reduce((sum, c) => sum + (c.gross_commission || 0), 0) || 0;
      const netTotal = commissions?.reduce((sum, c) => sum + (c.net_commission || 0), 0) || 0;
      const paidTotal = commissions?.reduce((sum, c) => sum + (c.paid_commission || 0), 0) || 0;
      const expensesTotal = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate previous month data for trends
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      const { data: prevCommissions } = await supabase
        .from('commissions')
        .select('gross_commission, net_commission, paid_commission')
        .gte('created_at', new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1).toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const { data: prevExpenses } = await supabase
        .from('cashflow')
        .select('amount')
        .eq('type', 'expense')
        .gte('created_at', new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1).toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const prevGrossTotal = prevCommissions?.reduce((sum, c) => sum + (c.gross_commission || 0), 0) || 0;
      const prevNetTotal = prevCommissions?.reduce((sum, c) => sum + (c.net_commission || 0), 0) || 0;
      const prevPaidTotal = prevCommissions?.reduce((sum, c) => sum + (c.paid_commission || 0), 0) || 0;
      const prevExpensesTotal = prevExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate trends
      const calculateTrend = (current: number, previous: number): TrendData => ({
        current,
        previous,
        percentage: previous > 0 ? ((current - previous) / previous) * 100 : 0
      });

      const newTrends = {
        grossCommission: calculateTrend(grossTotal, prevGrossTotal),
        netCommission: calculateTrend(netTotal, prevNetTotal),
        paidCommission: calculateTrend(paidTotal, prevPaidTotal),
        expenses: calculateTrend(expensesTotal, prevExpensesTotal)
      };

      setMetrics({
        grossCommission: grossTotal,
        netCommission: netTotal,
        paidCommission: paidTotal,
        totalExpenses: expensesTotal,
        totalEmployees: employeesCount || 0,
        totalGroups: groupsCount || 0,
        activeAccounts: activeAccountsCount || 0,
        monthlyGrowth: newTrends.netCommission.percentage,
        lastUpdated: new Date().toISOString()
      });

      setTrends(newTrends);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const TrendIndicator = ({ trend, type = 'positive' }: { trend: TrendData; type?: 'positive' | 'negative' }) => {
    const isPositive = trend.percentage > 0;
    const isGood = type === 'positive' ? isPositive : !isPositive;
    
    return (
      <div className={`flex items-center space-x-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {Math.abs(trend.percentage).toFixed(1)}%
        </span>
      </div>
    );
  };

  const MetricCard = ({ 
    title, 
    value, 
    trend, 
    icon: Icon, 
    type = 'positive',
    subtitle,
    progress
  }: {
    title: string;
    value: string | number;
    trend?: TrendData;
    icon: any;
    type?: 'positive' | 'negative';
    subtitle?: string;
    progress?: number;
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center justify-between mt-2">
            <TrendIndicator trend={trend} type={type} />
            <span className="text-xs text-gray-500">
              vs bulan lalu
            </span>
          </div>
        )}
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              Target bulanan: {progress.toFixed(1)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <AlertCircle className="w-5 h-5" />
            <span>Gagal memuat data dashboard</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const commissionProgress = metrics.netCommission > 0 ? 
    (metrics.paidCommission / metrics.netCommission) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Last updated info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}</span>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Real-time Data
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Komisi Kotor"
          value={formatCurrency(metrics.grossCommission)}
          trend={trends.grossCommission}
          icon={DollarSign}
          subtitle="Total komisi sebelum potongan"
        />
        
        <MetricCard
          title="Komisi Bersih"
          value={formatCurrency(metrics.netCommission)}
          trend={trends.netCommission}
          icon={Target}
          subtitle="Komisi setelah potongan"
        />
        
        <MetricCard
          title="Komisi Cair"
          value={formatCurrency(metrics.paidCommission)}
          trend={trends.paidCommission}
          icon={TrendingUp}
          subtitle="Komisi yang sudah dibayar"
          progress={commissionProgress}
        />
        
        <MetricCard
          title="Total Pengeluaran"
          value={formatCurrency(metrics.totalExpenses)}
          trend={trends.expenses}
          icon={TrendingDown}
          type="negative"
          subtitle="Pengeluaran bulan ini"
        />
        
        <MetricCard
          title="Total Karyawan"
          value={metrics.totalEmployees}
          icon={Users}
          subtitle="Karyawan aktif"
        />
        
        <MetricCard
          title="Total Group"
          value={metrics.totalGroups}
          icon={Building2}
          subtitle="Group yang terdaftar"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Akun Aktif</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {metrics.activeAccounts}
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">Profit Margin</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {metrics.totalExpenses > 0 ? 
                    (((metrics.netCommission - metrics.totalExpenses) / metrics.netCommission) * 100).toFixed(1) + '%' 
                    : '0%'
                  }
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Growth Rate</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">Conversion</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {metrics.paidCommission > 0 && metrics.grossCommission > 0 ? 
                    ((metrics.paidCommission / metrics.grossCommission) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;