import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const LeadDistributionChart = ({ data }) => {
  const COLORS = {
    cold: '#64748b',
    warm: '#f59e0b',
    hot: '#ef4444',
    new: '#0ea5e9',
    visited: '#8b5cf6',
    purchased: '#10b981',
    converted: '#10b981',
  };

  const LABELS = {
    cold: 'بارد',
    warm: 'دافئ',
    hot: 'ساخن',
    new: 'جديد',
    visited: 'زار المعرض',
    purchased: 'اشترى',
    converted: 'تم التحويل',
  };

  const chartData = data?.map(item => ({
    name: LABELS[item.lead_class] || item.lead_class,
    value: item.count,
    class: item.lead_class,
  })) || [];

  // Render the percentage INSIDE each slice — keeps labels from spilling past
  // the card edge and getting clipped on narrow (mobile) viewports.
  const renderSliceLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 0.65;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="card p-3 shadow-premium">
          <p className="text-foreground font-medium">{payload[0].name}</p>
          <p className="text-accent text-lg font-bold">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">توزيع العملاء المحتملين</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={renderSliceLabel}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.class]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {chartData.map((item) => (
          <div key={item.class} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[item.class] }}
            />
            <span className="text-sm text-foreground">{item.name}: </span>
            <span className="text-sm font-bold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadDistributionChart;
